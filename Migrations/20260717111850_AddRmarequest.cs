using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddRmarequest : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "RmaRequests",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ProjectId = table.Column<int>(type: "integer", nullable: false),
                    WarehouseId = table.Column<int>(type: "integer", nullable: false),
                    RmaNumber = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    Notes = table.Column<string>(type: "text", nullable: true),
                    CourierReference = table.Column<string>(type: "text", nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ShippedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ClosedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RmaRequests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RmaRequests_Projects_ProjectId",
                        column: x => x.ProjectId,
                        principalTable: "Projects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RmaRequests_Warehouses_WarehouseId",
                        column: x => x.WarehouseId,
                        principalTable: "Warehouses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RmaRequestItems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    RmaRequestId = table.Column<int>(type: "integer", nullable: false),
                    PhysicalAssetId = table.Column<int>(type: "integer", nullable: false),
                    Quantity = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RmaRequestItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RmaRequestItems_PhysicalAssets_PhysicalAssetId",
                        column: x => x.PhysicalAssetId,
                        principalTable: "PhysicalAssets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RmaRequestItems_RmaRequests_RmaRequestId",
                        column: x => x.RmaRequestId,
                        principalTable: "RmaRequests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_RmaRequestItems_PhysicalAssetId",
                table: "RmaRequestItems",
                column: "PhysicalAssetId");

            migrationBuilder.CreateIndex(
                name: "IX_RmaRequestItems_RmaRequestId",
                table: "RmaRequestItems",
                column: "RmaRequestId");

            migrationBuilder.CreateIndex(
                name: "IX_RmaRequests_ProjectId",
                table: "RmaRequests",
                column: "ProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_RmaRequests_WarehouseId",
                table: "RmaRequests",
                column: "WarehouseId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RmaRequestItems");

            migrationBuilder.DropTable(
                name: "RmaRequests");
        }
    }
}
