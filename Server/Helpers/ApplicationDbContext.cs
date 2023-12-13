namespace Server.Helpers;

using Microsoft.EntityFrameworkCore;
using Server.Models;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users { get; set; }
    public DbSet<RefreshToken> RefreshTokens { get; set; }
    public DbSet<AccessToken> AccessTokens { get; set; }
    public DbSet<AccessToken> Conversations { get; set; }
    public DbSet<AccessToken> Messages { get; set; }
    public DbSet<AccessToken> Participants { get; set; }
    public DbSet<SignalRConnectionId> SignalRConnectionIds { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>().HasIndex(u => u.Email).IsUnique();
        modelBuilder.Entity<User>().HasIndex(u => u.Username).IsUnique();

        //set primary key
        modelBuilder.Entity<Participant>()
            .HasKey(p => p.Id);

        //set relationships
        modelBuilder.Entity<User>()
            .HasMany(u => u.RefreshTokens).WithOne(rt => rt.User).HasForeignKey(rt => rt.UserId);
        modelBuilder.Entity<User>()
            .HasMany(u => u.SignalRConnectionIds).WithOne(s => s.User).HasForeignKey(s => s.UserId);

        modelBuilder.Entity<RefreshToken>()
            .HasMany(rt => rt.AccessTokens).WithOne(at => at.RefreshToken).HasForeignKey(at => at.RtId);

        modelBuilder.Entity<Participant>()
            .HasOne(p => p.User)
            .WithMany(u => u.Participants)
            .HasForeignKey(p => p.UserId);
        modelBuilder.Entity<Participant>()
            .HasOne(p => p.Conversation)
            .WithMany(c => c.Participants)
            .HasForeignKey(p => p.ConversationId);

        modelBuilder.Entity<Message>()
            .HasOne(m => m.Sender)
            .WithMany(u => u.SentMessages)
            .HasForeignKey(m => m.SenderId);
        modelBuilder.Entity<Message>()
            .HasOne(m => m.Conversation)
            .WithMany(c => c.Messages)
            .HasForeignKey(m => m.ConversationId);
    }
}

