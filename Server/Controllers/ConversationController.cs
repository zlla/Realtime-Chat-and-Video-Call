using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Server.Auth;
using Server.Helpers;
using Server.Hubs;
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
        private readonly IHubContext<ChatHub> _hubContext;

        public ConversationController(ApplicationDbContext db, AuthLibrary authLibrary, IHubContext<ChatHub> hubContext)
        {
            _db = db;
            _authLibrary = authLibrary;
            _hubContext = hubContext;
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
            string? username = principal.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Name)?.Value;

            if (string.IsNullOrEmpty(username))
            {
                BadRequest("Invalid username");
                return null;
            }

            // Get the user from the database by name
            User? userFromDb = await _db.Users.FirstOrDefaultAsync(u => u.Username == username);
            return userFromDb;
        }

        [HttpGet("getAll")]
        public async Task<IActionResult> GetAllConversations()
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
                    string? conversationName = conversation.ConversationName;

                    if (string.IsNullOrEmpty(conversationName) && conversation.ConversationType == "duo")
                    {
                        conversationName = await _db.Participants
                            .Where(p => p.ConversationId == conversation.Id && p.UserId != userFromDb.Id)
                            .Join(_db.Users, p => p.UserId, u => u.Id, (p, u) => u.Username)
                            .FirstOrDefaultAsync();
                    }
                    else
                    {
                        conversationName = conversation.Id.ToString();
                    }

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

        [HttpPatch("changeConversationName")]
        public async Task<IActionResult> ChangeConversationName([FromBody] ChangeConversationNameRequest request)
        {
            Conversation? conversation = await _db.Conversations.Where(c => c.Id == request.Id).FirstOrDefaultAsync();
            if (conversation == null)
            {
                return BadRequest("Conversation not found");
            }

            conversation.ConversationName = request.NewConversationName;
            _db.Conversations.Update(conversation);
            await _db.SaveChangesAsync();

            var signalRConnectionIds = await _db.Conversations
                .Where(c => c.Id == request.Id)
                .Join(_db.Participants, c => c.Id, p => p.ConversationId, (c, p) => p)
                .GroupJoin(_db.SignalRConnectionIds, p => p.UserId, s => s.UserId, (p, s) => new
                {
                    SignalRConnectionId = s.OrderByDescending(x => x.CreationTime).FirstOrDefault(),
                })
                .Select(r => r.SignalRConnectionId)
                .ToListAsync();

            foreach (var id in signalRConnectionIds)
            {
                if (id != null)
                {
                    await _hubContext.Clients.Client(id.Value.ToString()).SendAsync("ChangeConversationName");
                }
            }

            return Ok();
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

    public class ChangeConversationNameRequest
    {
        public required long Id { get; set; }
        public required string NewConversationName { get; set; }
    }
}