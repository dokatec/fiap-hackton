using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using AgroSolutions.IdentityService.Data;
using AgroSolutions.IdentityService.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace AgroSolutions.IdentityService.Controller;


[ApiController]
[Route("api/[controller]")]
public class IdentityController : ControllerBase
{
    private readonly IdentityDbContext _context;
    private readonly IConfiguration _config;

    public IdentityController(IdentityDbContext context, IConfiguration config)
    {
        _context = context;
        _config = config;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register(User user)
    {
        _context.Users.Add(user);
        await _context.SaveChangesAsync();
        return Ok(new { message = "Usuário registrado com sucesso" });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email && request.Password == request.Password);

        if (user == null)
        {
            return Unauthorized(new { message = "Email ou senha inválidos" });
        }

        var token = GenerateJwtToken(user);
        return Ok(new { token, user = user.Name });
    }

    private string GenerateJwtToken(User user)
    {
        var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"] ?? "ChaveSecretaMuitoLongaAgroSolutions2024"));
        var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Name, user.Name)
            };

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.Now.AddHours(8),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }


}




