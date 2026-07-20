using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddExpectedDeliveryLine : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ExpectedDeliveryLines",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    DeliveryNoteId = table.Column<int>(type: "integer", nullable: false),
                    PartNumber = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false),
                    ExpectedQuantity = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExpectedDeliveryLines", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ExpectedDeliveryLines_DeliveryNotes_DeliveryNoteId",
                        column: x => x.DeliveryNoteId,
                        principalTable: "DeliveryNotes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ExpectedDeliveryLines_DeliveryNoteId",
                table: "ExpectedDeliveryLines",
                column: "DeliveryNoteId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ExpectedDeliveryLines");
        }
    }
}
