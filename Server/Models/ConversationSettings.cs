using System.ComponentModel.DataAnnotations;

namespace Server.Models
{
    public class ConversationSettings
    {
        [Key]
        public required long Id { get; set; }
        public string? ConversationTheme { get; set; }
        public string? ConversationIcon { get; set; }
    }
}