using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Server.Auth;
using Server.Helpers;

namespace Server.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/userInfo")]
    public class UserInformationController : Controller
    {
        private readonly ApplicationDbContext _db;
        private readonly AuthLibrary _authLibrary;

        public UserInformationController(ApplicationDbContext db, AuthLibrary authLibrary)
        {
            _db = db;
            _authLibrary = authLibrary;
        }

        [HttpGet("test")]
        public IActionResult Test()
        {
            // Get the access token from the authorization header
            string? accessToken = Request.Headers["Authorization"].FirstOrDefault()?.Split(" ").Last();
            // Check if the access token is null or empty
            if (string.IsNullOrEmpty(accessToken))
            {
                return BadRequest("Access token is required");
            }

            // Validate the access token
            var principal = _authLibrary.Validate(accessToken);
            if (principal == null)
            {
                return BadRequest("Invalid access token");
            }

            // Get the user's email from the access token claims
            string? userEmail = principal.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Email)?.Value;
            // Check if the user's email is null or empty
            if (string.IsNullOrEmpty(userEmail))
            {
                return BadRequest("Invalid user");
            }

            return Ok(userEmail);
        }
    }
}