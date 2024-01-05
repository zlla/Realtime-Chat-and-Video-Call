using System.ComponentModel.DataAnnotations;

namespace Server.Models
{
    public class User
    {
        [Key]
        public long Id { get; set; }
        [Required]
        public required string Username { get; set; }
        [Required]
        public required string Email { get; set; }
        [Required]
        public required string Password { get; set; }
        public string? Role { get; set; }
        public string? Name { get; set; }
        public DateTime? AccountCreationDate { get; set; }
        public string? Nationality { get; set; }

        public virtual ICollection<RefreshToken>? RefreshTokens { get; set; }
        public virtual ICollection<Participant>? Participants { get; set; }
        public virtual ICollection<Message>? SentMessages { get; set; }
        public virtual ICollection<SignalRConnectionId>? SignalRConnectionIds { get; set; }
    }
}

