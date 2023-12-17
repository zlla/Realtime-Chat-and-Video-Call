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

        [HttpPost("saveSignalRId")]
        public async Task<IActionResult> SaveSignalRId([FromBody] SaveSignalRIdRequest saveSignalRIdRequest)
        {
            // Get the access token from the authorization header
            string? accessToken = Request.Headers["Authorization"].FirstOrDefault()?.Split(" ").Last();
            // Check if the access token is null or empty
            if (string.IsNullOrEmpty(accessToken))
            {
                return BadRequest("Access token is required");
            }
            var principal = _authLibrary.Validate(accessToken);
            if (principal == null)
            {
                return BadRequest("Invalid access token");
            }
            string? userName = principal.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Name)?.Value;
            if (string.IsNullOrEmpty(userName))
            {
                return BadRequest("Invalid username");
            }
            User? user = await _db.Users.FirstOrDefaultAsync(u => u.Username == userName);
            // Check if the user exists
            if (user == null)
            {
                return NotFound("User not found");
            }

            if (!string.IsNullOrEmpty(saveSignalRIdRequest.SId))
            {

                SignalRConnectionId newRecord = new()
                {
                    UserId = user.Id,
                    Value = saveSignalRIdRequest.SId,
                    CreationTime = DateTime.Now
                };

                _db.SignalRConnectionIds.Add(newRecord);
                await _db.SaveChangesAsync();

                return Ok();
            }

            return BadRequest();
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
                        .OrderByDescending(x => x.CreationTime)
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

        [HttpGet("getAll")]
        public async Task<IActionResult> GetAllUserAndSignalRId()
        {
            List<GetAllUserAndSignalRIdReturn>? list = new();
            List<User>? userList = new();
            userList = await _db.Users.ToListAsync();

            if (userList.Count > 0)
            {
                foreach (var user in userList)
                {
                    SignalRConnectionId? signalRConnectionId = await _db.SignalRConnectionIds
                        .Where(s => s.UserId == user.Id)
                        .OrderByDescending(x => x.CreationTime)
                        .FirstOrDefaultAsync();

                    if (signalRConnectionId != null)
                    {
                        GetAllUserAndSignalRIdReturn temp = new()
                        {
                            Username = user.Username,
                            SignalRId = signalRConnectionId.Value
                        };

                        list.Add(temp);
                    }
                }
            }

            return Ok(list);
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

    public class GetAllUserAndSignalRIdReturn
    {
        public required string Username { get; set; }
        public required string SignalRId { get; set; }
    }
}