using Backend.Models;

namespace backend.Models;

public enum LoanDirection { Loaned, Borrowed } // Loaned = prêté (sort du stock), Borrowed = emprunté (registre uniquement)

public class StockLoan
{
    public int Id { get; set; }
    public int ProjectId { get; set; }
    public Project? Project { get; set; }
    public int WarehouseId { get; set; }
    public Warehouse? Warehouse { get; set; }

    public LoanDirection Direction { get; set; }
    public string PartyName { get; set; } = string.Empty; // client (prêté) ou source (emprunté)
    public string? Notes { get; set; }
    public string Status { get; set; } = "Active"; // Active, Returned

    public DateTime LoanDate { get; set; } = DateTime.UtcNow;
    public DateTime? ExpectedReturnDate { get; set; }
    public DateTime? ReturnedDate { get; set; }

    public List<StockLoanItem> Items { get; set; } = new();
}

public class StockLoanItem
{
    public int Id { get; set; }
    public int StockLoanId { get; set; }
    public StockLoan? StockLoan { get; set; }

    public int? HardwareProductId { get; set; } // null si matériel emprunté hors catalogue
    public HardwareProduct? HardwareProduct { get; set; }
    public string PartNumber { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int Quantity { get; set; }
}