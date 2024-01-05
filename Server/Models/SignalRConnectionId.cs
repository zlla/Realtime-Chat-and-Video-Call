using System.ComponentModel.DataAnnotations;

namespace Server.Models
{
    public class SignalRConnectionId
    {
        [Key]
        public long Id { get; set; }
        [Required]
        public required long UserId { get; set; }
        [Required]
        public required string Value { get; set; }
        [Required]
        public required DateTime CreationTime { get; set; }

        public virtual User? User { get; set; }
    }
}