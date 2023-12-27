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
    [Route("api/chatHub")]
    public class ChatHubController : Controller
    {
        private readonly ApplicationDbContext _db;
        private readonly AuthLibrary _authLibrary;

        public ChatHubController(ApplicationDbContext db, AuthLibrary authLibrary)
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

            if (userFromDb == null)
            {
                NotFound("User not found");
                return null;
            }

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
}