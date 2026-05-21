using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AgroSolutions.AlertService.Models;
using AgroSolutions.AlertService.Data;

namespace AgroSolutions.AlertService.Controllers
{
    // Forçamos a rota para "api/Alerts" no plural para alinhar com as chamadas do frontend
    [ApiController]
    [Route("api/Alerts")]
    public class AlertsController : ControllerBase
    {
        private readonly AlertDbContext _context;

        // Injeção do contexto da base de dados do serviço de alertas
        public AlertsController(AlertDbContext context)
        {
            _context = context;
        }

        // GET: api/Alerts
        // Retorna a lista de todos os alertas ativos ordenados por data de criação decrescente
        [HttpGet]
        public async Task<ActionResult<IEnumerable<FieldAlert>>> GetAlerts()
        {
            try
            {
                var alerts = await _context.Alerts
                    .OrderByDescending(a => a.CreatedAt)
                    .ToListAsync();

                return Ok(alerts);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Erro ao carregar os alertas da base de dados", details = ex.Message });
            }
        }

        // DELETE: api/Alerts/{id}
        // Remove um alerta específico caso o utilizador decida resolvê-lo ou limpá-lo
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteAlert(int id)
        {
            try
            {
                var alert = await _context.Alerts.FindAsync(id);
                if (alert == null)
                {
                    return NotFound(new { message = "Alerta não encontrado." });
                }

                _context.Alerts.Remove(alert);
                await _context.SaveChangesAsync();

                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Erro ao eliminar o alerta", details = ex.Message });
            }
        }
    }
}