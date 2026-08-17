using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using backend.Models;
using Backend.Models;
using Backend.Data;
using Microsoft.AspNetCore.Authorization;
using backend.DTO;

namespace backend.controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SmrRequestsController : ControllerBase
    {
        private readonly AppDbContext _context;
        public SmrRequestsController(AppDbContext context) => _context = context;

        // GET: api/SmrRequests?projectId=3
     [HttpGet]
public async Task<IActionResult> GetSMRRequests([FromQuery] int? projectId)
{
    var query = _context.Set<SMRRequest>()
        .Include(r => r.Warehouse).Include(r => r.Client).Include(r => r.Subcontractor)
        .Include(r => r.Items).ThenInclude(i => i.HardwareProduct)
        .Include(r => r.SmrRequestSiteItems)
        .AsQueryable();

    if (projectId.HasValue) query = query.Where(r => r.ProjectId == projectId.Value);

    var requests = await query.OrderByDescending(r => r.CreatedDate).ToListAsync();

    return Ok(requests.Select(r => new
    {
        r.Id,
        r.SMRNumber,
        r.Status,
        r.CreatedDate,
        Warehouse = new { r.Warehouse!.Id, r.Warehouse.Name },
        Client = r.Client != null ? new { r.Client.Id, r.Client.Name } : null,
        Subcontractor = r.Subcontractor != null ? new { r.Subcontractor.Id, r.Subcontractor.Name } : null,
        ItemsCount = r.Items.Count,
        SiteItemsCount = r.SmrRequestSiteItems.Count,
        // NOUVEAU — signale une SMR approuvée avec allocation partielle (matériel manquant)
        HasShortfall = r.Status == "Approved" && (
            r.Items.Any(i => i.AllocatedQuantity < i.RequestedQuantity) ||
            r.SmrRequestSiteItems.Any(i => i.AllocatedQuantity < i.RequestedQuantity)
        )
    }));
}

        [HttpGet("{id}")]
        public async Task<IActionResult> GetSMRRequest(int id)
        {
            var request = await _context.Set<SMRRequest>()
                .Include(r => r.Warehouse).Include(r => r.Client).Include(r => r.Subcontractor)
                .Include(r => r.Items).ThenInclude(i => i.HardwareProduct)
                .Include(r => r.SmrRequestSiteItems).ThenInclude(i => i.HardwareProduct)
                .Include(r => r.SmrRequestSiteItems).ThenInclude(i => i.Site)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (request == null)
                return NotFound("Demande SMR introuvable.");

            return Ok(new
            {
                request.Id,
                request.SMRNumber,
                request.Status,
                request.CreatedDate,
                Warehouse = new { request.Warehouse!.Id, request.Warehouse.Name },
                Client = request.Client != null ? new { request.Client.Id, request.Client.Name } : null,
                Subcontractor = request.Subcontractor != null ? new { request.Subcontractor.Id, request.Subcontractor.Name } : null,
                Items = request.Items.Select(i => new
                {
                    i.Id,
                    i.HardwareProductId,
                    HardwareProduct = new { i.HardwareProduct!.PartNumber, i.HardwareProduct.Name },
                    i.RequestedQuantity,
                    i.AllocatedQuantity
                }),
                SmrRequestSiteItems = request.SmrRequestSiteItems.Select(i => new
                {
                    i.Id,
                    i.SiteId,
                    Site = new { i.Site!.SiteName },
                    i.HardwareProductId,
                    HardwareProduct = new { i.HardwareProduct!.PartNumber, i.HardwareProduct.Name },
                    i.RequestedQuantity,
                    i.AllocatedQuantity
                }),
                // NOUVEAU — signale une SMR approuvée avec allocation partielle (matériel manquant)
                HasShortfall = request.Status == "Approved" && (
                    request.Items.Any(i => i.AllocatedQuantity < i.RequestedQuantity) ||
                    request.SmrRequestSiteItems.Any(i => i.AllocatedQuantity < i.RequestedQuantity)
                )
            });
        }
        
        public class CreateSmrItemDto
        {
            public int HardwareProductId { get; set; }
            public int RequestedQuantity { get; set; }
        }

        // APRÈS — un seul site par SMR
        // APRÈS — un seul site par SMR
        public class CreateSmrDto
        {
            public string SMRNumber { get; set; } = string.Empty;
            public int ProjectId { get; set; }
            public int WarehouseId { get; set; }
            public int ClientId { get; set; }
            public int SiteId { get; set; }
            public List<CreateSmrItemDto> Items { get; set; } = new();
        }

        // POST: api/SmrRequests — création manuelle (le superviseur choisit le matériel à demander)
        [HttpPost]
        [Authorize(Roles = "Admin, Supervisor")]
        public async Task<IActionResult> CreateSMRRequest([FromBody] CreateSmrDto dto)
        {
            if (dto.Items == null || dto.Items.Count == 0)
                return BadRequest("La demande SMR doit contenir au moins un article.");

            var request = new SMRRequest
            {
                SMRNumber = dto.SMRNumber,
                ProjectId = dto.ProjectId,
                WarehouseId = dto.WarehouseId,
                ClientId = dto.ClientId,
                SiteIds = new List<int> { dto.SiteId },
                Status = "Pending",
                CreatedDate = DateTime.UtcNow,
                Items = dto.Items.Select(i => new SMRRequestItem
                {
                    HardwareProductId = i.HardwareProductId,
                    RequestedQuantity = i.RequestedQuantity
                }).ToList()
            };

            _context.Set<SMRRequest>().Add(request);
            await _context.SaveChangesAsync();

            _context.ActivityLogs.Add(new ActivityLog
            {
                ProjectId = dto.ProjectId,
                Type = "SMR_CREATED",
                Description = $"SMR {dto.SMRNumber} créée ({dto.Items.Count} référence(s))",
                PerformedBy = "Admin"
            });
            await _context.SaveChangesAsync();

            var saved = await _context.Set<SMRRequest>()
                .Include(r => r.Warehouse).Include(r => r.Client)
                .Include(r => r.Items).ThenInclude(i => i.HardwareProduct)
                .FirstOrDefaultAsync(r => r.Id == request.Id);

            return CreatedAtAction(nameof(GetSMRRequest), new { id = request.Id }, saved);
        }

        public class ShortageInfo
        {
            public int HardwareProductId { get; set; }
            public string PartNumber { get; set; } = string.Empty;
            public string Name { get; set; } = string.Empty;
            public int Requested { get; set; }
            public int Available { get; set; }
            public int Missing => Requested - Available; // NOUVEAU — quantité manquante, pour affichage direct
        }

        // Compare le stock dispo au reliquat encore nécessaire (RequestedQuantity - AllocatedQuantity),
        // pas à la quantité totale demandée — sur une première approbation AllocatedQuantity vaut 0,
        // donc le reliquat = la quantité demandée ; sur une complétion (SMR déjà partiellement
        // approuvée), seul ce qui manque encore compte.
        private async Task<List<ShortageInfo>> CheckAvailability(SMRRequest request)
        {
            var shortages = new List<ShortageInfo>();
            foreach (var item in request.Items)
            {
                var remaining = item.RequestedQuantity - item.AllocatedQuantity;
                if (remaining <= 0) continue; // déjà entièrement alloué

                var assets = await _context.PhysicalAssets
                    .Include(a => a.HardwareProduct)
                    .Where(a => a.HardwareProductId == item.HardwareProductId
                             && a.WarehouseId == request.WarehouseId
                             && a.Status == "STOCK")
                    .ToListAsync();

                var available = assets.Sum(a => a.Quantity - a.DefectiveQuantity);
                if (available < remaining)
                {
                    shortages.Add(new ShortageInfo
                    {
                        HardwareProductId = item.HardwareProductId,
                        PartNumber = assets.FirstOrDefault()?.HardwareProduct.PartNumber ?? item.HardwareProduct?.PartNumber ?? $"#{item.HardwareProductId}",
                        Name = assets.FirstOrDefault()?.HardwareProduct.Name ?? item.HardwareProduct?.Name ?? "",
                        Requested = remaining,
                        Available = available
                    });
                }
            }
            return shortages;
        }

        // Consomme le stock : entame les lots/unités "bon état" en priorité, marque
        // les unités totalement consommées comme "DEPLOYED" (sorties du warehouse,
        // matériel envoyé sur site) plutôt que de les supprimer — traçabilité conservée.
        private async Task DeductStockForItem(SMRRequestItem item, int warehouseId, int quantityToDeduct)
        {
            var assets = await _context.PhysicalAssets
                .Where(a => a.HardwareProductId == item.HardwareProductId
                         && a.WarehouseId == warehouseId
                         && a.Status == "STOCK")
                .OrderByDescending(a => a.Quantity - a.DefectiveQuantity)
                .ToListAsync();

            int remaining = quantityToDeduct;
            foreach (var asset in assets)
            {
                if (remaining <= 0) break;
                int goodAvail = asset.Quantity - asset.DefectiveQuantity;
                if (goodAvail <= 0) continue;

                int take = Math.Min(remaining, goodAvail);
                asset.Quantity -= take;
                remaining -= take;

                if (asset.Quantity <= 0)
                {
                    asset.Status = "DEPLOYED";
                    asset.WarehouseId = null;
                }
            }
        }

        public class SiteItemOverrideDto
        {
            public int SiteItemId { get; set; }
            public int ConfirmedQuantity { get; set; }
        }

        public class ApproveSmrDto
        {
            public string? ApprovedBy { get; set; }
            public bool ForcePartialAllocation { get; set; }
            public List<SiteItemOverrideDto>? SiteItemOverrides { get; set; } // NOUVEAU — mode sous-traitant uniquement
        }


        // PATCH: api/SmrRequests/5/approve
        [HttpPatch("{id}/approve")]
        [Authorize(Roles = "Admin, Supervisor")]
        public async Task<IActionResult> Approve(int id, [FromBody] ApproveSmrDto dto)
        {
            var request = await _context.Set<SMRRequest>()
                .Include(r => r.Items).ThenInclude(i => i.HardwareProduct)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (request == null) return NotFound();

            // Une SMR "Approved" avec allocation partielle peut être réapprouvée pour compléter
            // ce qui manque (ex : un réapprovisionnement est arrivé depuis) — mais seulement s'il
            // reste effectivement un reliquat non alloué. Une SMR déjà pleinement allouée, ou
            // rejetée, ne peut pas être retouchée ici.
            bool isCompletion = request.Status == "Approved";
            if (!isCompletion && request.Status != "Pending")
                return BadRequest("Cette demande n'est plus en attente.");

            if (request.SubcontractorId.HasValue)
            {
                // Mode "par sous-traitant" — plusieurs sites via SmrRequestSiteItem
                var siteItems = await _context.Set<SmrRequestSiteItem>()
    .Include(i => i.HardwareProduct)
    .Include(i => i.Site)
    .Where(i => i.SmrRequestId == id)
    .ToListAsync();

                // Applique les corrections du superviseur (papier vs constat terrain) avant déduction
                // — seulement à la première approbation, pas lors d'une complétion (déjà confirmées).
                if (!isCompletion && dto.SiteItemOverrides != null)
                {
                    foreach (var ov in dto.SiteItemOverrides)
                    {
                        var item = siteItems.FirstOrDefault(i => i.Id == ov.SiteItemId);
                        if (item != null) item.RequestedQuantity = ov.ConfirmedQuantity;
                    }
                }

                if (isCompletion && !siteItems.Any(i => i.AllocatedQuantity < i.RequestedQuantity))
                    return BadRequest("Cette SMR est déjà entièrement approuvée.");

                if (!dto.ForcePartialAllocation)
                {
                    var subShortages = new List<object>();
                    foreach (var item in siteItems)
                    {
                        var remaining = item.RequestedQuantity - item.AllocatedQuantity;
                        if (remaining <= 0) continue; // déjà entièrement alloué

                        var available = await _context.PhysicalAssets
                            .Where(a => a.HardwareProductId == item.HardwareProductId
                                     && a.WarehouseId == request.WarehouseId && a.Status == "STOCK")
                            .SumAsync(a => a.Quantity - a.DefectiveQuantity);

                        if (available < remaining)
                        {
                            subShortages.Add(new
                            {
                                hardwareProductId = item.HardwareProductId,
                                partNumber = item.HardwareProduct!.PartNumber,
                                name = item.HardwareProduct.Name,
                                available,
                                requested = remaining,
                                missing = remaining - available
                            });
                        }
                    }

                    if (subShortages.Count > 0)
                        return Conflict(new { message = "Stock insuffisant pour certaines références.", shortages = subShortages });
                }

                int deductedCount = 0;
                foreach (var item in siteItems)
                {
                    var remaining = item.RequestedQuantity - item.AllocatedQuantity;
                    if (remaining <= 0) continue; // déjà entièrement alloué — rien à faire

                    var available = await _context.PhysicalAssets
                        .Where(a => a.HardwareProductId == item.HardwareProductId
                                 && a.WarehouseId == request.WarehouseId && a.Status == "STOCK")
                        .SumAsync(a => a.Quantity - a.DefectiveQuantity);
                    int toDeduct = Math.Min(remaining, available);
                    if (toDeduct <= 0) continue;

                    await DeductStockForSiteItem(item.HardwareProductId, request.WarehouseId, toDeduct);
                    item.AllocatedQuantity += toDeduct;
                    deductedCount++;

                    _context.Set<DeploymentRecord>().Add(new DeploymentRecord
                    {
                        SmrRequestId = request.Id,
                        SiteId = item.SiteId,
                        HardwareProductId = item.HardwareProductId,
                        Quantity = toDeduct
                    });
                }

                request.Status = "Approved";
                await _context.SaveChangesAsync();

                _context.ActivityLogs.Add(new ActivityLog
                {
                    ProjectId = request.ProjectId,
                    Type = "SMR_APPROVED",
                    Description = isCompletion
                        ? $"SMR {request.SMRNumber} complétée (sous-traitant) — {deductedCount} référence(s) additionnelle(s) allouée(s)"
                        : $"SMR {request.SMRNumber} approuvée (sous-traitant) — matériel déduit sur {siteItems.Select(i => i.SiteId).Distinct().Count()} site(s)",
                    PerformedBy = dto.ApprovedBy ?? "Admin"
                });
                await _context.SaveChangesAsync();

                return Ok(new { message = $"SMR {request.SMRNumber} approuvée." });
            }

            // Sinon, comportement existant inchangé (mode par site, ne pas toucher)

            if (isCompletion && !request.Items.Any(i => i.AllocatedQuantity < i.RequestedQuantity))
                return BadRequest("Cette SMR est déjà entièrement approuvée.");

            if (!dto.ForcePartialAllocation)
            {
                var shortages = await CheckAvailability(request);
                if (shortages.Any())
                    return Conflict(new { message = "Stock insuffisant pour certaines références.", shortages });
            }

            foreach (var item in request.Items)
            {
                var remaining = item.RequestedQuantity - item.AllocatedQuantity;
                if (remaining <= 0) continue; // déjà entièrement alloué — rien à faire

                var assets = await _context.PhysicalAssets
                    .Where(a => a.HardwareProductId == item.HardwareProductId
                             && a.WarehouseId == request.WarehouseId
                             && a.Status == "STOCK")
                    .ToListAsync();
                var available = assets.Sum(a => a.Quantity - a.DefectiveQuantity);
                int toDeduct = Math.Min(remaining, available);
                if (toDeduct <= 0) continue;

                await DeductStockForItem(item, request.WarehouseId, toDeduct);
                item.AllocatedQuantity += toDeduct;

                if (request.SiteIds.Count > 0)
                {
                    _context.Set<DeploymentRecord>().Add(new DeploymentRecord
                    {
                        SmrRequestId = request.Id,
                        SiteId = request.SiteIds[0],
                        HardwareProductId = item.HardwareProductId,
                        Quantity = toDeduct
                    });
                }
            }

            request.Status = "Approved";
            await _context.SaveChangesAsync();

            _context.ActivityLogs.Add(new ActivityLog
            {
                ProjectId = request.ProjectId,
                Type = "SMR_APPROVED",
                Description = isCompletion
                    ? $"SMR {request.SMRNumber} complétée — reliquat alloué depuis le stock"
                    : $"SMR {request.SMRNumber} approuvée — matériel déduit du stock",
                PerformedBy = dto.ApprovedBy ?? "Admin"
            });
            await _context.SaveChangesAsync();

            return Ok(new { message = $"SMR {request.SMRNumber} approuvée." });
        }

        public class RejectSmrDto
        {
            public string? Reason { get; set; }
            public string? RejectedBy { get; set; }
        }

        // PATCH: api/SmrRequests/5/reject
        [HttpPatch("{id}/reject")]
        [Authorize(Roles = "Admin, Supervisor")]
        public async Task<IActionResult> Reject(int id, [FromBody] RejectSmrDto dto)
        {
            var request = await _context.Set<SMRRequest>().FindAsync(id);
            if (request == null) return NotFound();
            if (request.Status != "Pending") return BadRequest("Cette demande n'est plus en attente.");

            request.Status = "Rejected";
            await _context.SaveChangesAsync();

            _context.ActivityLogs.Add(new ActivityLog
            {
                ProjectId = request.ProjectId,
                Type = "SMR_REJECTED",
                Description = $"SMR {request.SMRNumber} rejetée" + (string.IsNullOrEmpty(dto.Reason) ? "" : $" — {dto.Reason}"),
                PerformedBy = dto.RejectedBy ?? "Admin"
            });
            await _context.SaveChangesAsync();

            return Ok(new { message = $"SMR {request.SMRNumber} rejetée." });
        }
        // GET: api/SmrRequests/deployments?siteId=5
        [HttpGet("deployments")]
        public async Task<IActionResult> GetDeployments([FromQuery] int? siteId, [FromQuery] int? projectId)
        {
            var query = _context.Set<DeploymentRecord>()
                .Include(d => d.HardwareProduct)
                .Include(d => d.Site)
                .Include(d => d.SmrRequest)
                .AsQueryable();

            if (siteId.HasValue) query = query.Where(d => d.SiteId == siteId.Value);
            if (projectId.HasValue) query = query.Where(d => d.SmrRequest!.ProjectId == projectId.Value);

            var records = await query.OrderByDescending(d => d.DeployedAt).ToListAsync();

            return Ok(records.Select(d => new
            {
                d.Id,
                d.Quantity,
                d.DeployedAt,
                SiteName = d.Site?.SiteName,
                PartNumber = d.HardwareProduct.PartNumber,
                ProductName = d.HardwareProduct.Name,
                SmrNumber = d.SmrRequest != null ? d.SmrRequest.SMRNumber : null,
            }));
        }
        // GET: api/SmrRequests/deployments/by-subcontractor?projectId=3
        [HttpGet("deployments/by-subcontractor")]
        public async Task<IActionResult> GetDeploymentsBySubcontractor([FromQuery] int projectId)
        {
            var records = await _context.Set<DeploymentRecord>()
                .Include(d => d.Site).ThenInclude(s => s!.Subcontractor)
                .Include(d => d.SmrRequest)
                .Where(d => d.SmrRequest!.ProjectId == projectId)
                .ToListAsync();

            var grouped = records
                .Where(d => d.Site?.Subcontractor != null)
                .GroupBy(d => d.Site!.Subcontractor!.Name)
                .Select(g => new
                {
                    Subcontractor = g.Key,
                    TotalQuantity = g.Sum(d => d.Quantity),
                    DistinctSites = g.Select(d => d.SiteId).Distinct().Count(),
                    DistinctMaterials = g.Select(d => d.HardwareProductId).Distinct().Count(),
                })
                .OrderByDescending(g => g.TotalQuantity)
                .ToList();

            return Ok(grouped);
        }

        // GET: api/SmrRequests/deployments/usage-ranking?projectId=3&take=5
       [HttpGet("deployments/usage-ranking")]
public async Task<IActionResult> GetUsageRanking([FromQuery] int projectId, [FromQuery] int take = 5)
{
    // Matériel réellement reçu dans ce projet, via shipments confirmés
    var receivedProducts = await _context.PhysicalAssets
        .Include(a => a.HardwareProduct)
        .Include(a => a.DeliveryNote)
        .Where(a => a.DeliveryNoteId != null && a.DeliveryNote!.ProjectId == projectId)
        .GroupBy(a => a.HardwareProduct)
        .Select(g => new { Product = g.Key, TotalReceived = g.Sum(a => a.Quantity) })
        .ToListAsync();

    var deployedRecords = await _context.Set<DeploymentRecord>()
        .Include(d => d.HardwareProduct)
        .Include(d => d.SmrRequest)
        .Where(d => d.SmrRequest!.ProjectId == projectId)
        .ToListAsync();

    var deployedByProductId = deployedRecords
        .GroupBy(d => d.HardwareProductId)
        .ToDictionary(g => g.Key, g => g.Sum(d => d.Quantity));

    var mostUsed = deployedRecords
        .GroupBy(d => d.HardwareProduct)
        .Select(g => new { PartNumber = g.Key!.PartNumber, Name = g.Key.Name, TotalDeployed = g.Sum(d => d.Quantity) })
        .OrderByDescending(p => p.TotalDeployed)
        .Take(take)
        .ToList();

    // Le moins utilisé = reçu dans ce projet, mais jamais déployé (0 dans DeploymentRecord)
    var leastUsed = receivedProducts
        .Where(rp => !deployedByProductId.ContainsKey(rp.Product!.Id) || deployedByProductId[rp.Product.Id] == 0)
        .OrderByDescending(rp => rp.TotalReceived) // priorité au stock dormant le plus important
        .Take(take)
        .Select(rp => new
        {
            PartNumber = rp.Product!.PartNumber,
            Name = rp.Product.Name,
            TotalDeployed = 0,
            TotalReceived = rp.TotalReceived
        })
        .ToList();

    return Ok(new { mostUsed, leastUsed });
}
        // POST: api/SmrRequests/import — import d'un fichier CSV pour un sous-traitant

        [HttpPost("import")]
        [Authorize(Roles = "Admin,Supervisor")]
        public async Task<IActionResult> ImportBySubcontractor([FromBody] SmrImportRequestDto dto)

        {
            if (dto.Lines.Count == 0) return BadRequest("Aucune ligne à importer.");

            var request = new SMRRequest
            {
                SMRNumber = dto.SmrNumber,
                ProjectId = dto.ProjectId,
                WarehouseId = dto.WarehouseId,
                ClientId = dto.ClientId,
                SubcontractorId = dto.SubcontractorId,
                Status = "Pending",
                CreatedDate = DateTime.UtcNow,
            };
            _context.Set<SMRRequest>().Add(request);
            await _context.SaveChangesAsync();

            int created = 0, skippedSites = 0;

            foreach (var line in dto.Lines)
            {
                if (line.Quantity <= 0 || string.IsNullOrWhiteSpace(line.PartNumber)) continue;

                // Le nom de site dans les fichiers Excel des sous-traitants est souvent générique
                // (ex : "urban", "suburb" — le TYPE de site plutôt qu'un code unique). Chercher par
                // SiteName seul, sans scoper par sous-traitant, faisait fusionner par erreur le site
                // "urban" du sous-traitant A avec le site "urban" du sous-traitant B : le second
                // s'attachait au même Site déjà possédé par le premier (SubcontractorId non modifiable
                // une fois posé), et ses déploiements disparaissaient silencieusement du tableau de
                // répartition par sous-traitant (filtré par Site.SubcontractorId). On ne réutilise donc
                // qu'un site déjà à CE sous-traitant, ou encore libre (jamais rattaché) — jamais un site
                // déjà possédé par un autre sous-traitant.
                var site = await _context.Sites.FirstOrDefaultAsync(s =>
                    s.SiteName == line.SiteName &&
                    (s.SubcontractorId == dto.SubcontractorId || s.SubcontractorId == null));
                if (site == null)
                {
                    site = new Site
                    {
                        SiteName = line.SiteName,
                        SiteType = string.IsNullOrEmpty(line.SiteType) ? null : line.SiteType,
                        SubcontractorId = dto.SubcontractorId,
                        ClientId = dto.ClientId,
                    };
                    _context.Sites.Add(site);
                    await _context.SaveChangesAsync();
                }
                else if (site.SubcontractorId == null)
                {
                    site.SubcontractorId = dto.SubcontractorId; // rattache le site si pas déjà assigné
                }

                var product = await _context.HardwareProducts.FirstOrDefaultAsync(p => p.PartNumber == line.PartNumber);
                if (product == null)
                {
                    skippedSites++; // référence inconnue au catalogue — signalée mais pas bloquante
                    continue;
                }

                _context.Set<SmrRequestSiteItem>().Add(new SmrRequestSiteItem
                {
                    SmrRequestId = request.Id,
                    SiteId = site.Id,
                    HardwareProductId = product.Id,
                    RequestedQuantity = line.Quantity,
                });
                created++;
            }

            await _context.SaveChangesAsync();

            _context.ActivityLogs.Add(new ActivityLog
            {
                ProjectId = dto.ProjectId,
                Type = "SMR_CREATED",
                Description = $"SMR {dto.SmrNumber} importée pour le sous-traitant ({created} ligne(s), {skippedSites} ignorée(s) — référence inconnue)",
                PerformedBy = "Admin"
            });
            await _context.SaveChangesAsync();

            return Ok(new { request.Id, created, skippedSites });
        }

        // Consomme le stock pour un item d'un site spécifique (mode sous-traitant)
        private async Task DeductStockForSiteItem(int hardwareProductId, int warehouseId, int quantityToDeduct)
        {
            var assets = await _context.PhysicalAssets
                .Where(a => a.HardwareProductId == hardwareProductId && a.WarehouseId == warehouseId && a.Status == "STOCK")
                .OrderByDescending(a => a.Quantity - a.DefectiveQuantity)
                .ToListAsync();

            int remaining = quantityToDeduct;
            foreach (var asset in assets)
            {
                if (remaining <= 0) break;
                int goodAvail = asset.Quantity - asset.DefectiveQuantity;
                if (goodAvail <= 0) continue;
                int take = Math.Min(remaining, goodAvail);
                asset.Quantity -= take;
                remaining -= take;
                if (asset.Quantity <= 0) { asset.Status = "DEPLOYED"; asset.WarehouseId = null; }
            }
        }
        [HttpGet("deployments/matrix")]
        public async Task<IActionResult> GetDeploymentMatrix([FromQuery] int projectId)
        {
            var subcontractors = await _context.Subcontractors.OrderBy(s => s.Name).ToListAsync();

            var records = await _context.Set<DeploymentRecord>()
                .Include(d => d.HardwareProduct)
                .Include(d => d.Site).ThenInclude(s => s!.Subcontractor)
                .Include(d => d.SmrRequest)
                .Where(d => d.SmrRequest!.ProjectId == projectId && d.Site!.SubcontractorId != null)
                .ToListAsync();

            // Quantité totale reçue depuis le début du projet, par matériel — issue des shipments confirmés
            var received = await _context.PhysicalAssets
                .Include(a => a.HardwareProduct)
                .Include(a => a.DeliveryNote)
                .Where(a => a.DeliveryNoteId != null && a.DeliveryNote!.ProjectId == projectId)
                .GroupBy(a => a.HardwareProductId)
                .Select(g => new { HardwareProductId = g.Key, TotalReceived = g.Sum(a => a.Quantity) })
                .ToDictionaryAsync(x => x.HardwareProductId, x => x.TotalReceived);

            var rows = records
                .GroupBy(d => d.HardwareProduct)
                .Select(g => new
                {
                    PartNumber = g.Key!.PartNumber,
                    Name = g.Key.Name,
                    BySubcontractor = subcontractors.ToDictionary(
                        s => s.Name,
                        s => g.Where(d => d.Site!.SubcontractorId == s.Id).Sum(d => d.Quantity)
                    ),
                    Total = g.Sum(d => d.Quantity),
                    Received = received.TryGetValue(g.Key.Id, out var r) ? r : 0
                })
                .OrderByDescending(r => r.Total)
                .ToList();

            return Ok(new { subcontractors = subcontractors.Select(s => s.Name), rows });
        }

        // GET: api/SmrRequests/deployments/stock-sufficiency?projectId=3
        // Compare, par matériel, ce qui est déjà sorti du stock pour ce projet (SMR + prêts)
        // avec ce qui reste disponible (stock actuel global + shipments en attente) —
        // indicateur de tension/rupture prévisible.
        [HttpGet("deployments/stock-sufficiency")]
        public async Task<IActionResult> GetStockSufficiency([FromQuery] int projectId)
        {
            // 1a. Exporté via SMR (déploiements) pour ce projet
            var deploymentRecords = await _context.DeploymentRecords
                .Include(d => d.SmrRequest)
                .Where(d => d.SmrRequest!.ProjectId == projectId)
                .ToListAsync();

            // 1b. Exporté via prêts (StockLoan Loaned) pour ce projet — les lignes sans
            // HardwareProductId (matériel non catalogué) sont ignorées
            var loanItems = await _context.StockLoanItems
                .Include(i => i.StockLoan)
                .Where(i => i.HardwareProductId != null
                         && i.StockLoan!.Direction == LoanDirection.Loaned
                         && i.StockLoan.ProjectId == projectId)
                .ToListAsync();

            var exportedByProduct = new Dictionary<int, int>();
            foreach (var d in deploymentRecords)
                exportedByProduct[d.HardwareProductId] = exportedByProduct.GetValueOrDefault(d.HardwareProductId) + d.Quantity;
            foreach (var i in loanItems)
                exportedByProduct[i.HardwareProductId!.Value] = exportedByProduct.GetValueOrDefault(i.HardwareProductId!.Value) + i.Quantity;

            // Matériel jamais exporté sur ce projet : pas pertinent d'afficher
            exportedByProduct = exportedByProduct.Where(kv => kv.Value > 0).ToDictionary(kv => kv.Key, kv => kv.Value);
            if (exportedByProduct.Count == 0)
                return Ok(new List<object>());

            var hardwareProducts = await _context.HardwareProducts
                .Where(p => exportedByProduct.Keys.Contains(p.Id))
                .ToListAsync();

            // 2. En attente — lignes des shipments encore Pending (IsApproved == false) de ce projet,
            // rattachées par PartNumber (ExpectedDeliveryLine n'a pas de FK vers HardwareProduct)
            var pendingLines = await _context.ExpectedDeliveryLines
                .Include(l => l.DeliveryNote)
                .Where(l => l.DeliveryNote!.ProjectId == projectId && !l.DeliveryNote.IsApproved)
                .ToListAsync();

            var pendingByPartNumber = pendingLines
                .GroupBy(l => l.PartNumber)
                .ToDictionary(g => g.Key, g => g.Sum(l => l.ExpectedQuantity));

            // 3. Stock actuel — global, indépendant du projet (cohérent avec Real-Time Inventory)
            var stockAssets = await _context.PhysicalAssets
                .Where(a => a.Status == "STOCK")
                .ToListAsync();
            var stockByProduct = stockAssets
                .GroupBy(a => a.HardwareProductId)
                .ToDictionary(g => g.Key, g => g.Sum(a => a.Quantity));

            var result = hardwareProducts
                .Select(p =>
                {
                    var exported = exportedByProduct.GetValueOrDefault(p.Id);
                    var pending = pendingByPartNumber.GetValueOrDefault(p.PartNumber);
                    var currentStock = stockByProduct.GetValueOrDefault(p.Id);
                    var totalAvailable = currentStock + pending;
                    return new
                    {
                        PartNumber = p.PartNumber,
                        Name = p.Name,
                        Exported = exported,
                        Pending = pending,
                        CurrentStock = currentStock,
                        TotalAvailable = totalAvailable,
                        IsOk = totalAvailable >= exported
                    };
                })
                .OrderBy(r => r.IsOk) // NOK (false) en premier — les problèmes remontent en haut
                .ThenByDescending(r => r.Exported)
                .ToList();

            return Ok(result);
        }

    }



}