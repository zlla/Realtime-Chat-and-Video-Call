using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Server.Models
{
    public class AccessToken
    {
        [Key]
        public long Id { get; set; }
        [Required]
        public required long RtId { get; set; }
        [Required]
        public required string Value { get; set; }
        [Required]
        public required DateTime ExpirationDate { get; set; }
        [Required]
        public required bool Revoked { get; set; } = false;

        public virtual RefreshToken? RefreshToken { get; set; }
    }
}