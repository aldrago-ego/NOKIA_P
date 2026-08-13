using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddExpectedDeliveryLineCategory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Category",
                table: "ExpectedDeliveryLines",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "MinimumStockThreshold",
                table: "Categories",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Category",
                table: "ExpectedDeliveryLines");

            migrationBuilder.DropColumn(
                name: "MinimumStockThreshold",
                table: "Categories");
        }
    }
}
