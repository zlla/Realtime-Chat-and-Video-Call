using System.ComponentModel.DataAnnotations;

namespace Server.Models
{
    public class RefreshToken
    {
        [Key]
        public long Id { get; set; }
        [Required]
        public required string Value { get; set; }
        [Required]
        public required long UserId { get; set; }
        [Required]
        public required DateTime ExpirationDate { get; set; }
        [Required]
        public required bool Revoked { get; set; } = false;

        public virtual User? User { get; set; }
        public virtual ICollection<AccessToken>? AccessTokens { get; set; }
    }
}

