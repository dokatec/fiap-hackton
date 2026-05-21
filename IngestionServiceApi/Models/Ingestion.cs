using System.ComponentModel.DataAnnotations;

namespace AgroSolutions.IngestionService.Models
{

    public class SensorReading
    {
        [Required]
        public int FieldId { get; set; }

        [Range(0, 100)]
        public double SoilHumidity { get; set; }

        public double Temperature { get; set; }

        public double PrecipitationLevel { get; set; }

        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }
}