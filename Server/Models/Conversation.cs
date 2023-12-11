using System.ComponentModel.DataAnnotations;

namespace Server.Models
{
    public class Conversation
    {
        [Key]
        public long Id { get; set; }
        public string? ConversationName { get; set; }
        [Required]
        public required DateTime CreatedAt { get; set; }

        public virtual ICollection<Participant>? Participants { get; set; }
        public virtual ICollection<Message>? Messages { get; set; }
    }
}