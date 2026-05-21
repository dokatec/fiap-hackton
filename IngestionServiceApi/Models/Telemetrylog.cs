using System.ComponentModel.DataAnnotations;

namespace AgroSolutions.IngestionService.Models;

public class TelemetryLog
{
    public int Id { get; set; }

    [Required]
    public int FieldId { get; set; }

    public double SoilHumidity { get; set; }

    public double Temperature { get; set; }

    public double PrecipitationLevel { get; set; }

    public DateTime ReceivedAt { get; set; } = DateTime.UtcNow;
}