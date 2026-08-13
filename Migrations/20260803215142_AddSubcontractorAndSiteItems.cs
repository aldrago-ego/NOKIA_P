using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddSubcontractorAndSiteItems : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "SubcontractorId",
                table: "smr_requests",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SiteType",
                table: "Sites",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SubcontractorId",
                table: "Sites",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "SmrRequestSiteItems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SmrRequestId = table.Column<int>(type: "integer", nullable: false),
                    SiteId = table.Column<int>(type: "integer", nullable: false),
                    HardwareProductId = table.Column<int>(type: "integer", nullable: false),
                    RequestedQuantity = table.Column<int>(type: "integer", nullable: false),
                    AllocatedQuantity = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SmrRequestSiteItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SmrRequestSiteItems_HardwareProducts_HardwareProductId",
                        column: x => x.HardwareProductId,
                        principalTable: "HardwareProducts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SmrRequestSiteItems_Sites_SiteId",
                        column: x => x.SiteId,
                        principalTable: "Sites",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SmrRequestSiteItems_smr_requests_SmrRequestId",
                        column: x => x.SmrRequestId,
                        principalTable: "smr_requests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Subcontractors",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Subcontractors", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_smr_requests_SubcontractorId",
                table: "smr_requests",
                column: "SubcontractorId");

            migrationBuilder.CreateIndex(
                name: "IX_Sites_SubcontractorId",
                table: "Sites",
                column: "SubcontractorId");

            migrationBuilder.CreateIndex(
                name: "IX_SmrRequestSiteItems_HardwareProductId",
                table: "SmrRequestSiteItems",
                column: "HardwareProductId");

            migrationBuilder.CreateIndex(
                name: "IX_SmrRequestSiteItems_SiteId",
                table: "SmrRequestSiteItems",
                column: "SiteId");

            migrationBuilder.CreateIndex(
                name: "IX_SmrRequestSiteItems_SmrRequestId",
                table: "SmrRequestSiteItems",
                column: "SmrRequestId");

            migrationBuilder.AddForeignKey(
                name: "FK_Sites_Subcontractors_SubcontractorId",
                table: "Sites",
                column: "SubcontractorId",
                principalTable: "Subcontractors",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_smr_requests_Subcontractors_SubcontractorId",
                table: "smr_requests",
                column: "SubcontractorId",
                principalTable: "Subcontractors",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Sites_Subcontractors_SubcontractorId",
                table: "Sites");

            migrationBuilder.DropForeignKey(
                name: "FK_smr_requests_Subcontractors_SubcontractorId",
                table: "smr_requests");

            migrationBuilder.DropTable(
                name: "SmrRequestSiteItems");

            migrationBuilder.DropTable(
                name: "Subcontractors");

            migrationBuilder.DropIndex(
                name: "IX_smr_requests_SubcontractorId",
                table: "smr_requests");

            migrationBuilder.DropIndex(
                name: "IX_Sites_SubcontractorId",
                table: "Sites");

            migrationBuilder.DropColumn(
                name: "SubcontractorId",
                table: "smr_requests");

            migrationBuilder.DropColumn(
                name: "SiteType",
                table: "Sites");

            migrationBuilder.DropColumn(
                name: "SubcontractorId",
                table: "Sites");
        }
    }
}
