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

                    if (string.IsNullOrEmpty(conversationName))
                    {
                        conversationName = conversation.ConversationType == "duo"
                            ? await _db.Participants
                                .Where(p => p.ConversationId == conversation.Id && p.UserId != userFromDb.Id)
                                .Select(p => p.ParticipantName)
                                .FirstOrDefaultAsync()
                            : await _db.Participants
                                .Where(p => p.ConversationId == conversation.Id && p.UserId != userFromDb.Id)
                                .Join(_db.Users, p => p.UserId, u => u.Id, (p, u) => u.Username)
                                .FirstOrDefaultAsync();
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
                        ConversationDetail temp;
                        if (conversation.ConversationType == "duo")
                        {
                            temp = new ConversationDetail
                            {
                                ConversationId = conversation.Id.ToString(),
                                ConversationName = conversationName,
                                MyNickname = await _db.Participants.Where(p => p.ConversationId == conversation.Id && p.UserId == userFromDb.Id)
                                                .Select(p => p.ParticipantName)
                                                .FirstOrDefaultAsync(),
                                ConversationType = conversation.ConversationType,
                                ReceiverName = receiverName,
                                RecentMessage = recentMessage?.Content,
                                RecentMessageId = recentMessage?.Id.ToString(),
                            };
                        }
                        else
                        {
                            temp = new ConversationDetail
                            {
                                ConversationId = conversation.Id.ToString(),
                                ConversationName = conversationName,
                                ConversationType = conversation.ConversationType,
                                ReceiverName = receiverName,
                                RecentMessage = recentMessage?.Content,
                                RecentMessageId = recentMessage?.Id.ToString(),
                            };
                        }
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

            User? userFromDb = await GetUserFromAccessToken();
            if (userFromDb == null)
            {
                return NotFound("User not found");
            }

            if (conversation.ConversationType == "group")
            {
                conversation.ConversationName = request.NewConversationName;
                _db.Conversations.Update(conversation);

                Message changeConversationNameMessage = new()
                {
                    ConversationId = conversation.Id,
                    SenderId = userFromDb.Id,
                    Content = conversation.ConversationType == "duo" ? $"has changed nickname to '{conversation.ConversationName}'" : $"has changed the chat name to '{conversation.ConversationName}'",
                    SentAt = DateTime.Now,
                    MessageType = "settings"
                };
                _db.Messages.Add(changeConversationNameMessage);

                await _db.SaveChangesAsync();

            }
            else if (conversation.ConversationType == "duo")
            {
                bool? isChangeSelfNickname = request.IsChangeSelfNickname;
                if (isChangeSelfNickname == null)
                {
                    return BadRequest();
                }

                Participant? participant;
                if ((bool)isChangeSelfNickname)
                {
                    participant = await _db.Participants.Where(p => p.ConversationId == conversation.Id && p.UserId == userFromDb.Id).FirstOrDefaultAsync();

                    if (participant == null)
                    {
                        return NotFound("Not found participant");
                    }

                    participant.ParticipantName = !string.IsNullOrEmpty(request.NewConversationName) ? request.NewConversationName : userFromDb.Username;
                    _db.Participants.Update(participant);
                }
                else
                {
                    participant = await _db.Participants.Where(p => p.ConversationId == conversation.Id && p.UserId != userFromDb.Id).FirstOrDefaultAsync();

                    if (participant == null)
                    {
                        return NotFound("Not found participant");
                    }

                    string? tempParticipantName = !string.IsNullOrEmpty(request.NewConversationName) ? request.NewConversationName : "";
                    if (tempParticipantName == "")
                    {
                        User? user2 = await _db.Users.Where(u => u.Id == participant.UserId).FirstOrDefaultAsync();
                        if (user2 == null) return NotFound("User 2 not found");
                        tempParticipantName = user2.Username;
                    }

                    participant.ParticipantName = tempParticipantName;

                    _db.Participants.Update(participant);
                }

                string changedNickname = participant.ParticipantName;

                Message changeConversationNameMessage = new()
                {
                    ConversationId = conversation.Id,
                    SenderId = userFromDb.Id,
                    Content = conversation.ConversationType == "duo" ? $"has changed nickname to '{changedNickname}'" : $"has changed the chat name to '{conversation.ConversationName}'",
                    SentAt = DateTime.Now,
                    MessageType = "settings"
                };
                _db.Messages.Add(changeConversationNameMessage);

                await _db.SaveChangesAsync();
            }


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
        public string? MyNickname { get; set; }
        public required string ConversationType { get; set; }
        public string? ReceiverName { get; set; }
        public string? RecentMessage { get; set; }
        public string? RecentMessageId { get; set; }
    }

    public class ChangeConversationNameRequest
    {
        public required long Id { get; set; }
        public required string NewConversationName { get; set; }
        public bool? IsChangeSelfNickname { get; set; }
    }
}