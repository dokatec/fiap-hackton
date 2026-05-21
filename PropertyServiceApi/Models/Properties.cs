using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace AgroSolutions.Properties.Models;

public class Property
{
    public int Id { get; set; }
    [Required(ErrorMessage = "O nome da propriedade é obrigatório")]
    public string Name { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;

    public List<Field> Fields { get; set; } = new();

}

public class Field
{

    public int Id { get; set; }
    [Required(ErrorMessage = "O nome do talhão é obrigatório")]
    public string Name { get; set; } = string.Empty;
    public string CropType { get; set; } = string.Empty;
    public double AreaHectares { get; set; }
    public int PropertyId { get; set; }

    [JsonIgnore]
    public Property? Property { get; set; }
}



