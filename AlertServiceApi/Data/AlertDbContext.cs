using Microsoft.EntityFrameworkCore;
using AgroSolutions.AlertService.Models;

namespace AgroSolutions.AlertService.Data;

public class AlertDbContext : DbContext
{
    public AlertDbContext(DbContextOptions<AlertDbContext> options) : base(options) { }

    public DbSet<FieldAlert> Alerts => Set<FieldAlert>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Otimização: Indexar o FieldId para consultas rápidas de histórico
        modelBuilder.Entity<FieldAlert>()
            .HasIndex(t => t.FieldId);

        base.OnModelCreating(modelBuilder);
    }
}

