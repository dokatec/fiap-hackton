using Microsoft.EntityFrameworkCore;
using AgroSolutions.IngestionService.Models;

namespace AgroSolutions.IngestionService.Data;

public class IngestionDbContext : DbContext
{
    public IngestionDbContext(DbContextOptions<IngestionDbContext> options) : base(options) { }

    public DbSet<TelemetryLog> TelemetryLogs => Set<TelemetryLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Otimização: Indexar o FieldId para consultas rápidas de histórico
        modelBuilder.Entity<TelemetryLog>()
            .HasIndex(t => t.FieldId);

        base.OnModelCreating(modelBuilder);
    }
}