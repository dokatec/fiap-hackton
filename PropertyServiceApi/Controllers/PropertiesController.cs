using AgroSolutions.Properties.Models;
using Microsoft.AspNetCore.Mvc;
using AgroSolutions.Properties.Data;
using Microsoft.EntityFrameworkCore;

namespace AgroSolutions.Properties.Controllers;

[ApiController]
[Route("api/Properties")]
public class PropertyController : ControllerBase
{

    private readonly AgroDbContext _context;

    public PropertyController(AgroDbContext context)
    {
        _context = context;
    }
    // Listar todas as propriedades e seus respectivos talhões
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Property>>> GetProperties()
    {
        return await _context.Properties
            .Include(p => p.Fields)
            .ToListAsync();
    }



    [HttpPost]
    public async Task<ActionResult<Property>> CreateProperties(Property property)
    {
        _context.Properties.Add(property);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetProperties), new { id = property.Id }, property);


    }
    [HttpPost("{propertyId}/fields")]
    public async Task<IActionResult> AddField(int propertyId, Field field)
    {
        var property = await _context.Properties.FindAsync(propertyId);

        if (property == null)
            return NotFound(new { message = "Propriedade rural não encontrada." });

        field.PropertyId = propertyId;
        _context.Fields.Add(field);
        await _context.SaveChangesAsync();

        return Ok(field);
    }

    // Remover um talhão
    [HttpDelete("fields/{id}")]
    public async Task<IActionResult> DeleteField(int id)
    {
        var field = await _context.Fields.FindAsync(id);
        if (field == null) return NotFound();

        _context.Fields.Remove(field);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}