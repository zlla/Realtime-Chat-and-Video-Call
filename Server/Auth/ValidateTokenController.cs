using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Server.Auth;

namespace Server.Controllers
{
    [ApiController]
    [Route("api/auth/validateToken")]
    [Authorize]
    public class ValidateTokenController : Controller
    {
        private readonly AuthLibrary _authLibrary;

        public ValidateTokenController(AuthLibrary authLibrary)
        {
            _authLibrary = authLibrary;
        }

        [AllowAnonymous]
        [HttpPost]
        public IActionResult Validate([FromBody] AccessTokenRequest? request)
        {
            if (request == null)
            {
                return Unauthorized();
            }

            if (!string.IsNullOrEmpty(request.AccessToken))
            {
                if (_authLibrary.Validate(request.AccessToken, true) != null)
                {
                    return Ok();
                }
            }

            return Unauthorized(request.AccessToken);
        }
    }

    public class AccessTokenRequest
    {
        public required string AccessToken { get; set; }
    }
}