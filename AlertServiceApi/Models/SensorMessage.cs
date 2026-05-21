namespace AgroSolutions.AlertService.Models;

public class SensorMessage
{
    public int FieldId { get; set; }
    public double SoilHumidity { get; set; }
    public double Temperature { get; set; }
    public double PrecipitationLevel { get; set; }
}