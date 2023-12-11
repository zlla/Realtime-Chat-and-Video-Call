using System.ComponentModel.DataAnnotations;

namespace Server.Models
{
    public class Participant
    {
        [Key]
        public long Id;
        [Required]
        public long UserId { get; set; }
        [Required]
        public long ConversationId { get; set; }
        public string? Role { get; set; }
        [Required]
        public required DateTime JoinedAt { get; set; }

        public virtual User? User { get; set; }
        public virtual Conversation? Conversation { get; set; }
    }
}