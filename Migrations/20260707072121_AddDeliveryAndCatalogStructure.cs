using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddDeliveryAndCatalogStructure : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "assets");

            migrationBuilder.CreateTable(
                name: "DeliveryNotes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    DeliveryNumber = table.Column<string>(type: "text", nullable: false),
                    PurchaseOrder = table.Column<string>(type: "text", nullable: false),
                    ArrivalDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IsApproved = table.Column<bool>(type: "boolean", nullable: false),
                    ApprovedBy = table.Column<string>(type: "text", nullable: false),
                    ApprovalDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DeliveryNotes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "HardwareProducts",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PartNumber = table.Column<string>(type: "text", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    MaterialGroup = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HardwareProducts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PhysicalAssets",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SerialNumber = table.Column<string>(type: "text", nullable: false),
                    HardwareProductId = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    IsManuallyVerified = table.Column<bool>(type: "boolean", nullable: false),
                    VerificationStatus = table.Column<string>(type: "text", nullable: false),
                    WarehouseId = table.Column<int>(type: "integer", nullable: true),
                    SiteId = table.Column<int>(type: "integer", nullable: true),
                    DeliveryNoteId = table.Column<int>(type: "integer", nullable: true),
                    UploadedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PhysicalAssets", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PhysicalAssets_DeliveryNotes_DeliveryNoteId",
                        column: x => x.DeliveryNoteId,
                        principalTable: "DeliveryNotes",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_PhysicalAssets_HardwareProducts_HardwareProductId",
                        column: x => x.HardwareProductId,
                        principalTable: "HardwareProducts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PhysicalAssets_Sites_SiteId",
                        column: x => x.SiteId,
                        principalTable: "Sites",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_PhysicalAssets_Warehouses_WarehouseId",
                        column: x => x.WarehouseId,
                        principalTable: "Warehouses",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_PhysicalAssets_DeliveryNoteId",
                table: "PhysicalAssets",
                column: "DeliveryNoteId");

            migrationBuilder.CreateIndex(
                name: "IX_PhysicalAssets_HardwareProductId",
                table: "PhysicalAssets",
                column: "HardwareProductId");

            migrationBuilder.CreateIndex(
                name: "IX_PhysicalAssets_SiteId",
                table: "PhysicalAssets",
                column: "SiteId");

            migrationBuilder.CreateIndex(
                name: "IX_PhysicalAssets_WarehouseId",
                table: "PhysicalAssets",
                column: "WarehouseId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PhysicalAssets");

            migrationBuilder.DropTable(
                name: "DeliveryNotes");

            migrationBuilder.DropTable(
                name: "HardwareProducts");

            migrationBuilder.CreateTable(
                name: "assets",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SiteId = table.Column<int>(type: "integer", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    ImageUrl = table.Column<string>(type: "text", nullable: false),
                    UploadedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_assets", x => x.Id);
                    table.ForeignKey(
                        name: "FK_assets_Sites_SiteId",
                        column: x => x.SiteId,
                        principalTable: "Sites",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_assets_SiteId",
                table: "assets",
                column: "SiteId");
        }
    }
}
