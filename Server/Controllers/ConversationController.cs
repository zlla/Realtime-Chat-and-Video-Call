using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Server.Auth;
using Server.Helpers;
using Server.Models;

namespace Server.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/conversation")]
    public class ConversationController : Controller
    {
        private readonly ApplicationDbContext _db;
        private readonly AuthLibrary _authLibrary;

        public ConversationController(ApplicationDbContext db, AuthLibrary authLibrary)
        {
            _db = db;
            _authLibrary = authLibrary;
        }

        private async Task<User?> GetUserFromAccessToken()
        {
            // Get the access token from the authorization header
            string? accessToken = Request.Headers["Authorization"].FirstOrDefault()?.Split(" ").Last();

            if (string.IsNullOrEmpty(accessToken))
            {
                BadRequest("Access token is required");
                return null;
            }

            var principal = _authLibrary.Validate(accessToken);

            if (principal == null)
            {
                BadRequest("Invalid access token");
                return null;
            }

            // Get the user's name from the access token claims
            string? userName = principal.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Name)?.Value;

            if (string.IsNullOrEmpty(userName))
            {
                BadRequest("Invalid username");
                return null;
            }

            // Get the user from the database by name
            User? userFromDb = await _db.Users.FirstOrDefaultAsync(u => u.Username == userName);
            return userFromDb;
        }

        [HttpGet("getAll")]
        public async Task<IActionResult> GetAllMessages()
        {
            User? userFromDb = await GetUserFromAccessToken();
            if (userFromDb == null)
            {
                return NotFound("User not found");
            }

            var conversations = await _db.Participants
                .Where(p => p.UserId == userFromDb.Id)
                .Join(_db.Conversations, p => p.ConversationId, c => c.Id, (p, c) => c)
                .GroupJoin(_db.Messages, c => c.Id, m => m.ConversationId, (c, messages) => new { Conversation = c, LastMessageSentAt = messages.Max(m => (DateTime?)m.SentAt) })
                .OrderByDescending(result => result.LastMessageSentAt ?? result.Conversation.CreatedAt)
                .Select(result => result.Conversation)
                .ToListAsync();

            var returnList = new List<ConversationDetail>();

            foreach (var conversation in conversations)
            {
                if (conversation != null)
                {
                    string? conversationName = conversation.ConversationType == "group"
                        ? conversation.ConversationName ?? conversation.Id.ToString()
                        : await _db.Participants
                            .Where(p => p.ConversationId == conversation.Id && p.UserId != userFromDb.Id)
                            .Join(_db.Users, p => p.UserId, u => u.Id, (p, u) => u.Username)
                            .FirstOrDefaultAsync();

                    string? receiverName = conversation.ConversationType == "group"
                        ? ""
                        : await _db.Participants
                            .Where(p => p.ConversationId == conversation.Id && p.UserId != userFromDb.Id)
                            .Join(_db.Users, p => p.UserId, u => u.Id, (p, u) => u.Username)
                            .FirstOrDefaultAsync();

                    Message? recentMessage = await _db.Messages
                        .Where(m => m.ConversationId == conversation.Id)
                        .OrderByDescending(m => m.SentAt)
                        .FirstOrDefaultAsync();

                    if (!string.IsNullOrEmpty(conversationName))
                    {
                        var temp = new ConversationDetail
                        {
                            ConversationId = conversation.Id.ToString(),
                            ConversationName = conversationName,
                            ConversationType = conversation.ConversationType,
                            ReceiverName = receiverName,
                            RecentMessage = recentMessage?.Content,
                            RecentMessageId = recentMessage?.Id.ToString(),
                        };
                        returnList.Add(temp);
                    }
                }
            }

            return Ok(returnList);
        }
    }

    public class ConversationDetail
    {
        public required string ConversationId { get; set; }
        public required string ConversationName { get; set; }
        public required string ConversationType { get; set; }
        public string? ReceiverName { get; set; }
        public string? RecentMessage { get; set; }
        public string? RecentMessageId { get; set; }
    }
}