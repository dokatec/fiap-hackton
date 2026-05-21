using Microsoft.EntityFrameworkCore;
using Prometheus;
using Microsoft.OpenApi.Models;
// Adicione o namespace correto dos seus modelos (ex: AgroSolutions.IdentityService.Models)
using AgroSolutions.Properties.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage;

var builder = WebApplication.CreateBuilder(args);

// 1. Configuração de Serviços
builder.Services.AddControllers();

// Configuração do Banco de Dados (PostgreSQL)
// Em cada API, mude o nome da ConnectionString e do DbContext
var connectionString = builder.Configuration.GetConnectionString("PropertiesConnection");
builder.Services.AddDbContext<AgroDbContext>(options =>
    options.UseNpgsql(connectionString));

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "AgroSolutions API", Version = "v1" });
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.AllowAnyOrigin()    // Permite chamadas de qualquer origem (inclusive localhost)
              .AllowAnyMethod()    // Permite qualquer método (GET, POST, PUT, DELETE)
              .AllowAnyHeader();   // Permite qualquer cabeçalho HTTP
    });
});

var app = builder.Build();

// Bloco de inicialização resiliente do banco de dados (Forçado para Banco Único)
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var logger = services.GetRequiredService<ILogger<Program>>();
    var context = services.GetRequiredService<AgroDbContext>();

    int maxRetries = 6;
    int delaySeconds = 5;

    for (int retry = 1; retry <= maxRetries; retry++)
    {
        try
        {
            logger.LogInformation("Identity: Verificando banco (Tentativa {Attempt} de {MaxRetries})...", retry, maxRetries);

            // Obtém o criador relacional do banco de dados para contornar o limite do EnsureCreated
            var databaseCreator = context.Database.GetService<IDatabaseCreator>() as RelationalDatabaseCreator;
            if (databaseCreator != null)
            {
                // Cria o banco de dados físico se este não existir
                if (!databaseCreator.Exists())
                {
                    databaseCreator.Create();
                }

                // Força a criação das tabelas deste DbContext mesmo que outras tabelas já existam no banco
                try
                {
                    databaseCreator.CreateTables();
                    logger.LogInformation("Identity: Tabelas do utilizador criadas com sucesso!");
                }
                catch (Npgsql.PostgresException ex) when (ex.SqlState == "42P07") // Código 42P07 = Tabela já existe
                {
                    logger.LogInformation("Identity: As tabelas de identidade já existem no banco unificado.");
                }
            }

            break;
        }
        catch (Exception ex)
        {
            logger.LogWarning("Identity: Aguardando o PostgreSQL ({Message}). Tentando novamente...", ex.Message);
            if (retry == maxRetries) throw;
            Thread.Sleep(TimeSpan.FromSeconds(delaySeconds));
        }
    }
}

// 2. Configuração de Middleware e Observabilidade
app.UseSwagger();
app.UseSwaggerUI();

// Métricas para o Prometheus
app.UseHttpMetrics();
app.MapMetrics();
app.UseCors("AllowFrontend");
app.UseAuthorization();
app.MapControllers();

app.Run();