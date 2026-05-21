using Microsoft.EntityFrameworkCore;
using AgroSolutions.Properties.Models;

namespace AgroSolutions.Properties.Data;

public class AgroDbContext : DbContext
{
    public AgroDbContext(DbContextOptions<AgroDbContext> options) : base(options) { }

    public DbSet<Property> Properties => Set<Property>();
    public DbSet<Field> Fields => Set<Field>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Configurações adicionais de modelo podem ser feitas aqui
        base.OnModelCreating(modelBuilder);
    }
}