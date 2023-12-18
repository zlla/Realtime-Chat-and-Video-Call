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
            var sId = saveSignalRIdRequest.SId;
            var username = saveSignalRIdRequest.Username;
            if (!string.IsNullOrEmpty(sId) && !string.IsNullOrEmpty(username))
            {
                User? userFromDb = await _db.Users.Where(u => u.Username == username).FirstOrDefaultAsync();
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

        [HttpGet("getAll")]
        public async Task<IActionResult> GetAllUserAndSignalRId()
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
            // Check if the user's name is null or empty
            if (string.IsNullOrEmpty(userName))
            {
                return BadRequest("Invalid username");
            }
            // Get the user from the database by name
            User? userFromDb = await _db.Users.FirstOrDefaultAsync(u => u.Username == userName);
            // Check if the user exists
            if (userFromDb == null)
            {
                return NotFound("User not found");
            }

            List<GetAllUserAndSignalRIdReturn>? list = new();
            List<User>? userList = new();
            userList = await _db.Users.ToListAsync();

            if (userList.Count > 0)
            {
                foreach (var user in userList)
                {
                    if (user != userFromDb)
                    {
                        SignalRConnectionId? signalRConnectionId = await _db.SignalRConnectionIds
                            .Where(s => s.UserId == user.Id)
                            .OrderByDescending(s => s.CreationTime)
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
            }

            return Ok(list);
        }
    }

    public class SaveSignalRIdRequest
    {
        public required string SId { get; set; }
        public required string Username { get; set; }
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