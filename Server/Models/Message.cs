using System.ComponentModel.DataAnnotations;

namespace Server.Models
{
    public class Message
    {
        [Key]
        public long Id { get; set; }
        [Required]
        public required long ConversationId { get; set; }
        [Required]
        public required long SenderId { get; set; }
        [Required]
        public required string Content { get; set; }
        [Required]
        public required DateTime SentAt { get; set; }
        [Required]
        public required string MessageType { get; set; }

        public virtual User? Sender { get; set; }
        public virtual Conversation? Conversation { get; set; }
    }
}