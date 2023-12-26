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
    [Route("api/message")]
    public class MessageController : Controller
    {
        private readonly ApplicationDbContext _db;
        private readonly AuthLibrary _authLibrary;

        public MessageController(ApplicationDbContext db, AuthLibrary authLibrary)
        {
            _db = db;
            _authLibrary = authLibrary;
        }

        [HttpGet("getAll")]
        public async Task<IActionResult> GetAllMessages()
        {
            // Get the access token from the authorization header
            string? accessToken = Request.Headers["Authorization"].FirstOrDefault()?.Split(" ").Last();
            if (string.IsNullOrEmpty(accessToken))
            {
                return BadRequest("Access token is required");
            }
            var principal = _authLibrary.Validate(accessToken);
            if (principal == null)
            {
                return BadRequest("Invalid access token");
            }
            // Get the user's name from the access token claims
            string? userName = principal.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Name)?.Value;
            if (string.IsNullOrEmpty(userName))
            {
                return BadRequest("Invalid username");
            }
            User? userFromDb = await _db.Users.Where(u => u.Username == userName).FirstOrDefaultAsync();
            // Check if the user exists

            if (userFromDb == null)
            {
                return BadRequest();
            }

            var conversations = await _db.Participants
                .Where(p => p.UserId == userFromDb.Id)
                .Join(_db.Conversations, p => p.ConversationId, c => c.Id, (p, c) => c)
                .OrderByDescending(c => _db.Messages
                    .Where(m => m.ConversationId == c.Id)
                    .Max(m => (DateTime?)m.SentAt))
                .ToListAsync();

            var returnList = new List<GetAllMessagesReturn>();

            foreach (var conversation in conversations)
            {
                var messagesDTO = await _db.Messages
                    .Where(m => m.ConversationId == conversation.Id)
                    .Select(m => new MessageDTO
                    {
                        Id = m.Id,
                        SenderId = m.SenderId,
                        Content = m.Content,
                        SendAt = m.SentAt,
                        MessageType = m.MessageType
                    })
                    .ToListAsync();

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

                    if (!string.IsNullOrEmpty(conversationName))
                    {
                        var temp = new GetAllMessagesReturn
                        {
                            ConversationId = conversation.Id.ToString(),
                            ConversationName = conversationName,
                            ConversationType = conversation.ConversationType,
                            ReceiverName = receiverName,
                            MessagesDTO = messagesDTO
                        };
                        returnList.Add(temp);
                    }
                }
            }

            return Ok(returnList);
        }

    }

    public class MessageDTO
    {
        public required long Id { get; set; }
        public required long SenderId { get; set; }
        public required string Content { get; set; }
        public required DateTime SendAt { get; set; }
        public required string MessageType { get; set; }
    }

    public class GetAllMessagesReturn
    {
        public required string ConversationId { get; set; }
        public required string ConversationName { get; set; }
        public required string ConversationType { get; set; }
        public string? ReceiverName { get; set; }
        public required List<MessageDTO>? MessagesDTO { get; set; }
    }
}