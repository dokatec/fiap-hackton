using Microsoft.EntityFrameworkCore;
using AgroSolutions.IdentityService.Models;

namespace AgroSolutions.IdentityService.Data;

public class IdentityDbContext : DbContext
{
    public IdentityDbContext(DbContextOptions<IdentityDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Configurações adicionais de modelo podem ser feitas aqui
        base.OnModelCreating(modelBuilder);
    }
}