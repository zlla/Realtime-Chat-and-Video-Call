using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Server.Auth;
using Server.Helpers;
using Server.Hubs;
using Server.Models;
using Server.Services.Interfaces;

namespace Server.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/chatHub")]
    public class ChatHubController : Controller
    {
        private readonly ApplicationDbContext _db;
        private readonly IAuthLibrary _authLibrary;
        private readonly IHubContext<ChatHub> _hubContext;

        public ChatHubController(ApplicationDbContext db, IAuthLibrary authLibrary, IHubContext<ChatHub> hubContext)
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

        [HttpPost("saveSignalRId")]
        public async Task<IActionResult> SaveSignalRId([FromBody] SaveSignalRIdRequest saveSignalRIdRequest)
        {
            string sId = saveSignalRIdRequest.SId;
            if (string.IsNullOrEmpty(sId))
            {
                return BadRequest();
            }
            User? userFromDb = await GetUserFromAccessToken();
            if (userFromDb == null)
            {
                return NotFound("User not found");
            }

            SignalRConnectionId newRecord = new()
            {
                UserId = userFromDb.Id,
                Value = saveSignalRIdRequest.SId,
                CreationTime = DateTime.Now
            };

            _db.SignalRConnectionIds.Add(newRecord);
            await _db.SaveChangesAsync();

            return Ok();
        }

        [HttpGet("getSignalRId")]
        public async Task<IActionResult> GetSignalRId([FromBody] GetSignalRIdRequest getSignalRIdRequest)
        {
            if (!string.IsNullOrEmpty(getSignalRIdRequest.Username))
            {

                User? user = await _db.Users.Where(u => u.Username == getSignalRIdRequest.Username).FirstOrDefaultAsync();
                if (user != null)
                {
                    SignalRConnectionId? signalRConnectionId = await _db.SignalRConnectionIds
                        .Where(s => s.UserId == user.Id)
                        .OrderByDescending(s => s.CreationTime)
                        .FirstOrDefaultAsync();
                    if (signalRConnectionId != null)
                    {
                        return Ok(signalRConnectionId.Value);
                    }
                    else
                    {
                        return NotFound();
                    }
                }

            }

            return BadRequest("Invalid Username");
        }

        [HttpGet("getAllDuoConversationInfo")]
        public async Task<IActionResult> GetAllDuoConversationInfo()
        {
            User? userFromDb = await GetUserFromAccessToken();
            if (userFromDb == null)
            {
                return NotFound("User not found");
            }

            List<GetAllDuoConversationInfoReturn> list = await (
                from user in _db.Users
                where user.Id != userFromDb.Id
                select new GetAllDuoConversationInfoReturn
                {
                    Username = user.Username,
                }
            ).ToListAsync();

            return Ok(list);
        }

        [HttpGet("getAllGroupConversationInfo")]
        public async Task<IActionResult> GetAllGroupConversationInfo()
        {
            User? userFromDb = await GetUserFromAccessToken();
            if (userFromDb == null)
            {
                return NotFound("User not found");
            }

            List<GetAllGroupConversationInfoReturn> conversationsReturn = await (
                from participant in _db.Participants
                where participant.UserId == userFromDb.Id
                join conversation in _db.Conversations on participant.ConversationId equals conversation.Id
                where conversation.ConversationType == "group"
                select new GetAllGroupConversationInfoReturn
                {
                    GroupId = conversation.Id,
                    GroupName = conversation.ConversationName
                }
            ).ToListAsync();

            return Ok(conversationsReturn);
        }

        [HttpPost("newGroup")]
        public async Task<IActionResult> NewGroup([FromBody] NewGroupRequest request)
        {
            if (request is null || !ModelState.IsValid)
                return BadRequest("Invalid request. Please provide valid data.");

            var userFromDb = await GetUserFromAccessToken();
            if (userFromDb is null)
                return BadRequest("User Not Found");

            var usernameList = request.UsernameList;
            var conversationName = string.IsNullOrWhiteSpace(request.ConversationName)
                ? $"{userFromDb.Username}, {string.Join(", ", usernameList)}"
                : request.ConversationName;

            var userIdList = await _db.Users
                .Where(u => usernameList.Contains(u.Username))
                .Select(u => u.Id)
                .ToListAsync();

            userIdList.Add(userFromDb.Id);

            if (string.IsNullOrWhiteSpace(conversationName))
                return BadRequest("Unexpected Error");

            var conversation = new Conversation
            {
                ConversationName = conversationName,
                ConversationType = "group",
                CreatedAt = DateTime.Now,
            };

            await _db.Conversations.AddAsync(conversation);
            await _db.SaveChangesAsync();

            var participants = userIdList.Select(userId => new Participant
            {
                UserId = userId,
                ParticipantName = userId.ToString(),
                ConversationId = conversation.Id,
                JoinedAt = DateTime.Now,
            }).ToList();

            if (participants.Any())
            {
                await _db.Participants.AddRangeAsync(participants);
                await _db.SaveChangesAsync();

                var signalRConnectionIds = await _db.SignalRConnectionIds
                    .Where(s => userIdList.Contains(s.UserId))
                    .GroupBy(s => s.UserId)
                    .Select(group => group
                        .OrderByDescending(s => s.CreationTime)
                        .FirstOrDefault())
                    .ToListAsync();

                foreach (var item in signalRConnectionIds)
                {
                    if (item != null)
                    {
                        await _hubContext.Clients.Client(item.Value.ToString()).SendAsync("NewGroup");
                    }
                }
            }

            return Ok();
        }
    }

    public class SaveSignalRIdRequest
    {
        public required string SId { get; set; }
    }

    public class GetSignalRIdRequest
    {
        public required string Username { get; set; }
    }

    public class GetAllDuoConversationInfoReturn
    {
        public required string Username { get; set; }
    }

    public class GetAllGroupConversationInfoReturn
    {
        public required long GroupId { get; set; }
        public string? GroupName { get; set; }
    }

    public class NewGroupRequest
    {
        public string? ConversationName { get; set; }
        public required List<string> UsernameList { get; set; }
    }
}