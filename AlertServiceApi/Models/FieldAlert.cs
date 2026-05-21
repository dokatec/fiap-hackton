namespace AgroSolutions.AlertService.Models;

public class FieldAlert
{
    public int Id { get; set; }
    public int FieldId { get; set; }
    public string Message { get; set; } = string.Empty;
    public string Severity { get; set; } = "Alerta";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
