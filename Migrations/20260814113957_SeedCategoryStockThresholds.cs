using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class SeedCategoryStockThresholds : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Seed provisoire pour activer l'alerte stock bas (Categories.MinimumStockThreshold
            // était vide partout, donc /Categories/stock-status et /low-stock-items ne
            // remontaient jamais rien). RAN = 20 fixe comme demandé ; les autres domaines
            // reçoivent une valeur aléatoire (5 à 30) à ajuster manuellement ensuite.
            // Domain (enum MaterialDomain) : RAN=0, Microwave=1, Energy=2, Core=3, Consumables=4.
            // Ne touche que les catégories sans seuil déjà configuré.
            migrationBuilder.Sql(@"
                UPDATE ""Categories"" SET ""MinimumStockThreshold"" = 20
                WHERE ""Domain"" = 0 AND ""MinimumStockThreshold"" IS NULL;
            ");
            migrationBuilder.Sql(@"
                UPDATE ""Categories"" SET ""MinimumStockThreshold"" = (5 + floor(random() * 26))::int
                WHERE ""Domain"" <> 0 AND ""MinimumStockThreshold"" IS NULL;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"UPDATE ""Categories"" SET ""MinimumStockThreshold"" = NULL;");
        }
    }
}
