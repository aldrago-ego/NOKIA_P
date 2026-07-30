using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class addloans : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "StockLoans",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ProjectId = table.Column<int>(type: "integer", nullable: false),
                    WarehouseId = table.Column<int>(type: "integer", nullable: false),
                    Direction = table.Column<int>(type: "integer", nullable: false),
                    PartyName = table.Column<string>(type: "text", nullable: false),
                    Notes = table.Column<string>(type: "text", nullable: true),
                    Status = table.Column<string>(type: "text", nullable: false),
                    LoanDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ExpectedReturnDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ReturnedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StockLoans", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StockLoans_Projects_ProjectId",
                        column: x => x.ProjectId,
                        principalTable: "Projects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_StockLoans_Warehouses_WarehouseId",
                        column: x => x.WarehouseId,
                        principalTable: "Warehouses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "StockLoanItems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    StockLoanId = table.Column<int>(type: "integer", nullable: false),
                    HardwareProductId = table.Column<int>(type: "integer", nullable: true),
                    PartNumber = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false),
                    Quantity = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StockLoanItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StockLoanItems_HardwareProducts_HardwareProductId",
                        column: x => x.HardwareProductId,
                        principalTable: "HardwareProducts",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_StockLoanItems_StockLoans_StockLoanId",
                        column: x => x.StockLoanId,
                        principalTable: "StockLoans",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_StockLoanItems_HardwareProductId",
                table: "StockLoanItems",
                column: "HardwareProductId");

            migrationBuilder.CreateIndex(
                name: "IX_StockLoanItems_StockLoanId",
                table: "StockLoanItems",
                column: "StockLoanId");

            migrationBuilder.CreateIndex(
                name: "IX_StockLoans_ProjectId",
                table: "StockLoans",
                column: "ProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_StockLoans_WarehouseId",
                table: "StockLoans",
                column: "WarehouseId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "StockLoanItems");

            migrationBuilder.DropTable(
                name: "StockLoans");
        }
    }
}
