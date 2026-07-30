using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddDeploymentRecord : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DeploymentRecords",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SmrRequestId = table.Column<int>(type: "integer", nullable: false),
                    SiteId = table.Column<int>(type: "integer", nullable: false),
                    HardwareProductId = table.Column<int>(type: "integer", nullable: false),
                    Quantity = table.Column<int>(type: "integer", nullable: false),
                    DeployedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DeploymentRecords", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DeploymentRecords_HardwareProducts_HardwareProductId",
                        column: x => x.HardwareProductId,
                        principalTable: "HardwareProducts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DeploymentRecords_Sites_SiteId",
                        column: x => x.SiteId,
                        principalTable: "Sites",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DeploymentRecords_smr_requests_SmrRequestId",
                        column: x => x.SmrRequestId,
                        principalTable: "smr_requests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DeploymentRecords_HardwareProductId",
                table: "DeploymentRecords",
                column: "HardwareProductId");

            migrationBuilder.CreateIndex(
                name: "IX_DeploymentRecords_SiteId",
                table: "DeploymentRecords",
                column: "SiteId");

            migrationBuilder.CreateIndex(
                name: "IX_DeploymentRecords_SmrRequestId",
                table: "DeploymentRecords",
                column: "SmrRequestId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DeploymentRecords");
        }
    }
}
