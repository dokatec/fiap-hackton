using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using Confluent.Kafka;
using AgroSolutions.IngestionService.Models;

namespace AgroSolutions.IngestionService.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class IngestionController : ControllerBase
    {
        private readonly IConfiguration _config;
        private readonly ProducerConfig _producerConfig;
        private readonly string _topic = "sensor-data";

        public IngestionController(IConfiguration config)
        {
            _config = config;

            // Configuração do Producer do Kafka
            _producerConfig = new ProducerConfig
            {
                BootstrapServers = _config["Kafka:BootstrapServers"] ?? "localhost:9092",
                // Garante que a mensagem seja entregue (Acks.All = redundância máxima)
                Acks = Acks.All,
                MessageTimeoutMs = 5000
            };
        }

        [HttpPost("send")]
        public async Task<IActionResult> IngestData([FromBody] SensorReading reading)
        {
            try
            {
                using (var producer = new ProducerBuilder<Null, string>(_producerConfig).Build())
                {
                    // Serializa o objeto para JSON
                    var messageValue = JsonSerializer.Serialize(reading);

                    // Cria a mensagem para o Kafka
                    var message = new Message<Null, string> { Value = messageValue };

                    // Envia de forma assíncrona para o tópico definido
                    var deliveryResult = await producer.ProduceAsync(_topic, message);

                    return Ok(new
                    {
                        message = "Dados enviados para o Kafka com sucesso.",
                        status = deliveryResult.Status.ToString(),
                        offset = deliveryResult.Offset.Value,
                        timestamp = reading.Timestamp
                    });
                }
            }
            catch (ProduceException<Null, string> ex)
            {
                return StatusCode(500, new
                {
                    error = "Erro ao produzir mensagem no Kafka",
                    details = ex.Error.Reason
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    error = "Erro interno no servidor",
                    details = ex.Message
                });
            }
        }
    }
}