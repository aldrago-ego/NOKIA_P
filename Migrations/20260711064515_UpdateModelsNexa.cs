using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class UpdateModelsNexa : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ProjectId",
                table: "smr_requests",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "Domain",
                table: "HardwareProducts",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AlterColumn<string>(
                name: "PurchaseOrder",
                table: "DeliveryNotes",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "ApprovedBy",
                table: "DeliveryNotes",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AddColumn<int>(
                name: "ContainersCount",
                table: "DeliveryNotes",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "InvoiceNumber",
                table: "DeliveryNotes",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Location",
                table: "DeliveryNotes",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Mot",
                table: "DeliveryNotes",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "ProjectId",
                table: "DeliveryNotes",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "Scope",
                table: "DeliveryNotes",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "VesselArrivalDate",
                table: "DeliveryNotes",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "VesselDepartureDate",
                table: "DeliveryNotes",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Waybill",
                table: "DeliveryNotes",
                type: "text",
                nullable: true);

            // migrationBuilder.CreateTable(
            //     name: "Projects",
            //     columns: table => new
            //     {
            //         Id = table.Column<int>(type: "integer", nullable: false)
            //             .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
            //         Name = table.Column<string>(type: "text", nullable: false),
            //         Code = table.Column<string>(type: "text", nullable: false),
            //         StartDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
            //         EndDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
            //         IsCurrent = table.Column<bool>(type: "boolean", nullable: false),
            //         HasFullTraceability = table.Column<bool>(type: "boolean", nullable: false)
            //     },
            //     constraints: table =>
            //     {
            //         table.PrimaryKey("PK_Projects", x => x.Id);
            //     });

            migrationBuilder.CreateTable(
                name: "ActivityLogs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ProjectId = table.Column<int>(type: "integer", nullable: false),
                    Type = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false),
                    PerformedBy = table.Column<string>(type: "text", nullable: false),
                    Timestamp = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ActivityLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ActivityLogs_Projects_ProjectId",
                        column: x => x.ProjectId,
                        principalTable: "Projects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_smr_requests_ProjectId",
                table: "smr_requests",
                column: "ProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_DeliveryNotes_ProjectId",
                table: "DeliveryNotes",
                column: "ProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_ActivityLogs_ProjectId",
                table: "ActivityLogs",
                column: "ProjectId");

            migrationBuilder.AddForeignKey(
                name: "FK_DeliveryNotes_Projects_ProjectId",
                table: "DeliveryNotes",
                column: "ProjectId",
                principalTable: "Projects",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_smr_requests_Projects_ProjectId",
                table: "smr_requests",
                column: "ProjectId",
                principalTable: "Projects",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_DeliveryNotes_Projects_ProjectId",
                table: "DeliveryNotes");

            migrationBuilder.DropForeignKey(
                name: "FK_smr_requests_Projects_ProjectId",
                table: "smr_requests");

            migrationBuilder.DropTable(
                name: "ActivityLogs");

            migrationBuilder.DropTable(
                name: "Projects");

            migrationBuilder.DropIndex(
                name: "IX_smr_requests_ProjectId",
                table: "smr_requests");

            migrationBuilder.DropIndex(
                name: "IX_DeliveryNotes_ProjectId",
                table: "DeliveryNotes");

            migrationBuilder.DropColumn(
                name: "ProjectId",
                table: "smr_requests");

            migrationBuilder.DropColumn(
                name: "Domain",
                table: "HardwareProducts");

            migrationBuilder.DropColumn(
                name: "ContainersCount",
                table: "DeliveryNotes");

            migrationBuilder.DropColumn(
                name: "InvoiceNumber",
                table: "DeliveryNotes");

            migrationBuilder.DropColumn(
                name: "Location",
                table: "DeliveryNotes");

            migrationBuilder.DropColumn(
                name: "Mot",
                table: "DeliveryNotes");

            migrationBuilder.DropColumn(
                name: "ProjectId",
                table: "DeliveryNotes");

            migrationBuilder.DropColumn(
                name: "Scope",
                table: "DeliveryNotes");

            migrationBuilder.DropColumn(
                name: "VesselArrivalDate",
                table: "DeliveryNotes");

            migrationBuilder.DropColumn(
                name: "VesselDepartureDate",
                table: "DeliveryNotes");

            migrationBuilder.DropColumn(
                name: "Waybill",
                table: "DeliveryNotes");

            migrationBuilder.AlterColumn<string>(
                name: "PurchaseOrder",
                table: "DeliveryNotes",
                type: "text",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "ApprovedBy",
                table: "DeliveryNotes",
                type: "text",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);
        }
    }
}
