using System.Text.Json;
using Confluent.Kafka;
using AgroSolutions.AlertService.Models;
using AgroSolutions.AlertService.Data;

namespace AgroSolutions.AlertService.Workers
{
    public class AlertWorker : BackgroundService
    {
        private readonly ILogger<AlertWorker> _logger;
        private readonly IServiceProvider _serviceProvider;
        private readonly IConfiguration _config;
        private readonly string _topic = "sensor-data";

        public AlertWorker(ILogger<AlertWorker> logger, IServiceProvider serviceProvider, IConfiguration config)
        {
            _logger = logger;
            _serviceProvider = serviceProvider;
            _config = config;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            // Resolução robusta do endereço de conexão com o broker Kafka
            var bootstrapServers = _config["Kafka:BootstrapServers"];
            if (string.IsNullOrWhiteSpace(bootstrapServers))
            {
                bootstrapServers = Environment.GetEnvironmentVariable("Kafka__BootstrapServers") ?? "kafka:9092";
            }

            var conf = new ConsumerConfig
            {
                BootstrapServers = bootstrapServers,
                GroupId = "alert-service-group-v1",
                AutoOffsetReset = AutoOffsetReset.Earliest,
                EnableAutoCommit = true,
                SocketTimeoutMs = 10000
            };

            using var consumer = new ConsumerBuilder<Ignore, string>(conf)
                .SetErrorHandler((_, e) => _logger.LogError($"--> Kafka Protocol Error: {e.Reason}"))
                .Build();

            consumer.Subscribe(_topic);
            _logger.LogInformation("--> [CONECTADO] Alert Service escutando no endereço {Server} o tópico: {Topic}", bootstrapServers, _topic);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    // Timeout curto de consumo para evitar travamentos de thread
                    var result = consumer.Consume(TimeSpan.FromSeconds(1));
                    if (result == null) continue;

                    var sensorData = JsonSerializer.Deserialize<SensorMessage>(result.Message.Value, new JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true
                    });

                    if (sensorData != null)
                    {
                        _logger.LogInformation("--> Mensagem Recebida do Kafka: Talhão {Id} | Humidade: {Hum}%", sensorData.FieldId, sensorData.SoilHumidity);

                        // REGRA CORRIGIDA: Sempre geramos o registro no banco para que o frontend 
                        // consiga alterar dinamicamente o status do talhão entre Verde e Vermelho
                        await GenerateAlert(sensorData);
                    }
                }
                catch (ConsumeException ex) when (ex.Error.Code == ErrorCode.Local_UnknownTopic || ex.Error.Code == ErrorCode.UnknownTopicOrPart)
                {
                    _logger.LogWarning("--> Aviso: O tópico '{Topic}' ainda não foi criado no Broker do Kafka. Aguardando publicação inicial...", _topic);
                    await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);
                }
                catch (OperationCanceledException)
                {
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError("--> Erro no consumo de mensagens do Kafka: {Msg}. Retentando em 5s...", ex.Message);
                    await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
                }
            }

            consumer.Close();
        }

        private async Task GenerateAlert(SensorMessage data)
        {
            try
            {
                using var scope = _serviceProvider.CreateScope();
                var context = scope.ServiceProvider.GetRequiredService<AlertDbContext>();

                // Define dinamicamente o nível de severidade e a mensagem com base na humidade do solo
                string severity = data.SoilHumidity < 30.0 ? "Alerta de Seca" : "Informativo";
                string message = data.SoilHumidity < 30.0
                    ? $"Humidade Crítica Detectada: {data.SoilHumidity}%"
                    : $"Leitura Saudável Registrada: Humidade em {data.SoilHumidity}%";

                var alert = new FieldAlert
                {
                    FieldId = data.FieldId,
                    Message = message,
                    Severity = severity,
                    CreatedAt = DateTime.UtcNow
                };

                context.Alerts.Add(alert);
                await context.SaveChangesAsync();

                _logger.LogInformation("--> [SUCESSO] Registro ({Severity}) persistido no banco de dados para o Talhão {Id}", severity, data.FieldId);
            }
            catch (Exception ex)
            {
                _logger.LogCritical("--> [ERRO CRÍTICO] Falha ao gravar atividade no banco: {Msg}", ex.Message);
            }
        }
    }
}