using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddQuantityAndFixNullableRefs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_SmrRequests_Clients_ClientId",
                table: "SmrRequests");

            migrationBuilder.DropForeignKey(
                name: "FK_SmrRequests_Warehouses_WarehouseId",
                table: "SmrRequests");

            migrationBuilder.DropPrimaryKey(
                name: "PK_SmrRequests",
                table: "SmrRequests");

            migrationBuilder.RenameTable(
                name: "SmrRequests",
                newName: "smr_requests");

            migrationBuilder.RenameColumn(
                name: "SmrNumber",
                table: "smr_requests",
                newName: "SMRNumber");

            migrationBuilder.RenameIndex(
                name: "IX_SmrRequests_WarehouseId",
                table: "smr_requests",
                newName: "IX_smr_requests_WarehouseId");

            migrationBuilder.RenameIndex(
                name: "IX_SmrRequests_ClientId",
                table: "smr_requests",
                newName: "IX_smr_requests_ClientId");

            migrationBuilder.AddColumn<int>(
                name: "DefectiveQuantity",
                table: "PhysicalAssets",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "Quantity",
                table: "PhysicalAssets",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "IsSerialized",
                table: "HardwareProducts",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "smr_requests",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "SMRNumber",
                table: "smr_requests",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AddPrimaryKey(
                name: "PK_smr_requests",
                table: "smr_requests",
                column: "Id");

            migrationBuilder.CreateTable(
                name: "smr_request_items",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SMRRequestId = table.Column<int>(type: "integer", nullable: false),
                    HardwareProductId = table.Column<int>(type: "integer", nullable: false),
                    RequestedQuantity = table.Column<int>(type: "integer", nullable: false),
                    AllocatedQuantity = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_smr_request_items", x => x.Id);
                    table.ForeignKey(
                        name: "FK_smr_request_items_HardwareProducts_HardwareProductId",
                        column: x => x.HardwareProductId,
                        principalTable: "HardwareProducts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_smr_request_items_smr_requests_SMRRequestId",
                        column: x => x.SMRRequestId,
                        principalTable: "smr_requests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_smr_request_items_HardwareProductId",
                table: "smr_request_items",
                column: "HardwareProductId");

            migrationBuilder.CreateIndex(
                name: "IX_smr_request_items_SMRRequestId",
                table: "smr_request_items",
                column: "SMRRequestId");

            migrationBuilder.AddForeignKey(
                name: "FK_smr_requests_Clients_ClientId",
                table: "smr_requests",
                column: "ClientId",
                principalTable: "Clients",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_smr_requests_Warehouses_WarehouseId",
                table: "smr_requests",
                column: "WarehouseId",
                principalTable: "Warehouses",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_smr_requests_Clients_ClientId",
                table: "smr_requests");

            migrationBuilder.DropForeignKey(
                name: "FK_smr_requests_Warehouses_WarehouseId",
                table: "smr_requests");

            migrationBuilder.DropTable(
                name: "smr_request_items");

            migrationBuilder.DropPrimaryKey(
                name: "PK_smr_requests",
                table: "smr_requests");

            migrationBuilder.DropColumn(
                name: "DefectiveQuantity",
                table: "PhysicalAssets");

            migrationBuilder.DropColumn(
                name: "Quantity",
                table: "PhysicalAssets");

            migrationBuilder.DropColumn(
                name: "IsSerialized",
                table: "HardwareProducts");

            migrationBuilder.RenameTable(
                name: "smr_requests",
                newName: "SmrRequests");

            migrationBuilder.RenameColumn(
                name: "SMRNumber",
                table: "SmrRequests",
                newName: "SmrNumber");

            migrationBuilder.RenameIndex(
                name: "IX_smr_requests_WarehouseId",
                table: "SmrRequests",
                newName: "IX_SmrRequests_WarehouseId");

            migrationBuilder.RenameIndex(
                name: "IX_smr_requests_ClientId",
                table: "SmrRequests",
                newName: "IX_SmrRequests_ClientId");

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "SmrRequests",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50);

            migrationBuilder.AlterColumn<string>(
                name: "SmrNumber",
                table: "SmrRequests",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(100)",
                oldMaxLength: 100);

            migrationBuilder.AddPrimaryKey(
                name: "PK_SmrRequests",
                table: "SmrRequests",
                column: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_SmrRequests_Clients_ClientId",
                table: "SmrRequests",
                column: "ClientId",
                principalTable: "Clients",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_SmrRequests_Warehouses_WarehouseId",
                table: "SmrRequests",
                column: "WarehouseId",
                principalTable: "Warehouses",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
