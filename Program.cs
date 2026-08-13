using Backend.Data;
using Backend.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using backend.Models;

var builder = WebApplication.CreateBuilder(args);

// 1. CONFIGURATION DU CORS (Un seul bloc regroupant toutes les origines admises, sans slash final)
builder.Services.AddCors(options =>
{
    options.AddPolicy("ReactCorsPolicy", policy =>
    {
        policy.WithOrigins(
                "http://localhost:5173",
                "https://nokia-p.vercel.app",
                "https://nokia-4cvnn0l0g-aldrago-egos-projects.vercel.app"
              )
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var port = Environment.GetEnvironmentVariable("PORT") ?? "5000";
builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// ... Reste de vos services et configuration

// 2. CONFIGURATION DE LA BASE DE DONNÉES (PostgreSQL)
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));
// Authentification JWT
var jwtKey = builder.Configuration["Jwt:Key"]!;
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });

builder.Services.AddAuthorization();

var app = builder.Build();

// Swagger activé pour tester facilement vos routes d'inventaire
app.UseSwagger();
app.UseSwaggerUI();


// 3. ACTIVATION DU CORS (Le nom correspond maintenant à la configuration ci-dessus)
app.UseCors("ReactCorsPolicy");
app.UseAuthentication();

app.UseAuthorization();
app.MapControllers();

// Seeding initial des données de test
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;

    var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    context.Database.Migrate();
    try
    {
        if (!context.Clients.Any())
        {
            context.Clients.Add(new Client { Name = "Yas Togo Manager", CompanyName = "Yas Togo", Email = "inventory@yas.tg" });
            context.Warehouses.Add(new Warehouse { Name = "Lomé Main Warehouse", Code = "WH-LOM-01", Location = "Lomé Port" });
            context.SaveChanges();
        }

        var hasher = new PasswordHasher<User>();

        if (!context.Users.Any(u => u.Username == "admin"))
        {
            var admin = new User { Username = "admin", Role = "Admin", DisplayName = "ADMIN" };
            admin.PasswordHash = hasher.HashPassword(admin, "Admin123!");
            context.Users.Add(admin);
        }

        if (!context.Users.Any(u => u.Username == "viewer"))
        {
            var viewer = new User { Username = "viewer", Role = "Viewer", DisplayName = "VIEWER" };
            viewer.PasswordHash = hasher.HashPassword(viewer, "LOL222222!");
            context.Users.Add(viewer);
        }

        if (!context.Users.Any(u => u.Username == "supervisor"))
        {
            var supervisor = new User { Username = "supervisor", Role = "Supervisor", DisplayName = "SUPERVISOR" };
            supervisor.PasswordHash = hasher.HashPassword(supervisor, "Supervisor123!");
            context.Users.Add(supervisor);
        }
        foreach (var name in new[] { "Zemtic", "CTL", "Hammer", "Wilsem" })
        {
            if (!context.Set<Subcontractor>().Any(s => s.Name == name))
                context.Set<Subcontractor>().Add(new Subcontractor { Name = name });
        }
        context.SaveChanges();
    }
    catch (Exception ex)
    {
        Console.WriteLine($"⚠️ Seeding ignoré (base de données inaccessible au démarrage) : {ex.Message}");
    }


}
app.Run();