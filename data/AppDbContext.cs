using Microsoft.EntityFrameworkCore;
using Backend.Models;
using backend.Models;

namespace Backend.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        // Déclaration de tes tables
        public DbSet<SMRRequest> SmrRequests { get; set; }
        public DbSet<Client> Clients { get; set; }
        public DbSet<Warehouse> Warehouses { get; set; }
        public DbSet<Site> Sites { get; set; }
        public DbSet<PhysicalAsset> PhysicalAssets { get; set; }
        public DbSet<HardwareProduct> HardwareProducts { get; set; }
        public DbSet<DeliveryNote> DeliveryNotes { get; set; }
        public DbSet<Asset> Assets { get; set; } // Ajout de la table Assets
        public DbSet<Project> Projects { get; set; }
        public DbSet<ExpectedDeliveryLine> ExpectedDeliveryLines { get; set; }
        public DbSet<ActivityLog> ActivityLogs { get; set; }
        public DbSet<Category> Categories { get; set; }
        public DbSet<RmaRequest> RmaRequests { get; set; }
        public DbSet<RmaRequestItem> RmaRequestItems { get; set; }
        public DbSet<User> Users { get; set; }
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            var utcConverter = new Microsoft.EntityFrameworkCore.Storage.ValueConversion.ValueConverter<DateTime, DateTime>(
                v => v.Kind == DateTimeKind.Utc ? v : DateTime.SpecifyKind(v, DateTimeKind.Utc),
                v => DateTime.SpecifyKind(v, DateTimeKind.Utc)
            );

            foreach (var entityType in modelBuilder.Model.GetEntityTypes())
            {
                foreach (var property in entityType.GetProperties())
                {
                    if (property.ClrType == typeof(DateTime))
                        property.SetValueConverter(utcConverter);
                    else if (property.ClrType == typeof(DateTime?))
                        property.SetValueConverter(new Microsoft.EntityFrameworkCore.Storage.ValueConversion.ValueConverter<DateTime?, DateTime?>(
                            v => v.HasValue ? (v.Value.Kind == DateTimeKind.Utc ? v.Value : DateTime.SpecifyKind(v.Value, DateTimeKind.Utc)) : v,
                            v => v.HasValue ? DateTime.SpecifyKind(v.Value, DateTimeKind.Utc) : v
                        ));
                }
            }
        }
    }
}
