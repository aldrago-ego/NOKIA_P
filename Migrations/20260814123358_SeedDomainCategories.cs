using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class SeedDomainCategories : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Amorce la fonctionnalité "stock bas" : aucune Category n'existait encore
            // (table vide), donc tous les produits restaient sur le MaterialGroup
            // placeholder "À catégoriser" et /Categories/stock-status et /low-stock-items
            // ne pouvaient jamais rien détecter. Crée une catégorie "fourre-tout" par
            // domaine (Domain: RAN=0, Microwave=1, Energy=2, Core=3, Consumables=4) avec
            // un seuil, puis y rattache tous les produits encore non catégorisés de ce
            // domaine. À affiner plus tard en catégories plus fines via CategoryManager.
            migrationBuilder.Sql(@"
                INSERT INTO ""Categories"" (""Name"", ""Domain"", ""MinimumStockThreshold"")
                SELECT 'RAN', 0, 20
                WHERE NOT EXISTS (SELECT 1 FROM ""Categories"" WHERE ""Name"" = 'RAN');
            ");
            migrationBuilder.Sql(@"
                INSERT INTO ""Categories"" (""Name"", ""Domain"", ""MinimumStockThreshold"")
                SELECT 'Microwave', 1, (5 + floor(random() * 26))::int
                WHERE NOT EXISTS (SELECT 1 FROM ""Categories"" WHERE ""Name"" = 'Microwave');
            ");
            migrationBuilder.Sql(@"
                INSERT INTO ""Categories"" (""Name"", ""Domain"", ""MinimumStockThreshold"")
                SELECT 'Energy', 2, (5 + floor(random() * 26))::int
                WHERE NOT EXISTS (SELECT 1 FROM ""Categories"" WHERE ""Name"" = 'Energy');
            ");
            migrationBuilder.Sql(@"
                INSERT INTO ""Categories"" (""Name"", ""Domain"", ""MinimumStockThreshold"")
                SELECT 'Core', 3, (5 + floor(random() * 26))::int
                WHERE NOT EXISTS (SELECT 1 FROM ""Categories"" WHERE ""Name"" = 'Core');
            ");
            migrationBuilder.Sql(@"
                INSERT INTO ""Categories"" (""Name"", ""Domain"", ""MinimumStockThreshold"")
                SELECT 'Consumables', 4, (5 + floor(random() * 26))::int
                WHERE NOT EXISTS (SELECT 1 FROM ""Categories"" WHERE ""Name"" = 'Consumables');
            ");

            migrationBuilder.Sql(@"
                UPDATE ""HardwareProducts"" hp
                SET ""MaterialGroup"" = c.""Name""
                FROM ""Categories"" c
                WHERE hp.""Domain"" = c.""Domain""
                  AND hp.""MaterialGroup"" = 'À catégoriser'
                  AND c.""Name"" IN ('RAN', 'Microwave', 'Energy', 'Core', 'Consumables');
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                UPDATE ""HardwareProducts""
                SET ""MaterialGroup"" = 'À catégoriser'
                WHERE ""MaterialGroup"" IN ('RAN', 'Microwave', 'Energy', 'Core', 'Consumables');
            ");
            migrationBuilder.Sql(@"
                DELETE FROM ""Categories""
                WHERE ""Name"" IN ('RAN', 'Microwave', 'Energy', 'Core', 'Consumables');
            ");
        }
    }
}
