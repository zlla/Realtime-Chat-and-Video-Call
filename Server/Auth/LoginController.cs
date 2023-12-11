using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using Server.Auth;
using Server.Models;
using Server.Helpers;

namespace Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [AllowAnonymous]
    public class LoginController : Controller
    {
        private readonly ApplicationDbContext _db;
        private readonly AuthLibrary _authLibrary;

        public LoginController(ApplicationDbContext db, AuthLibrary authLibrary)
        {
            _db = db;
            _authLibrary = authLibrary;
        }

        [HttpPost]
        public IActionResult LoginPost([FromBody] UserLogin user)
        {
            if (user != null)
            {
                if (!user.Username.IsNullOrEmpty() && !user.Password.IsNullOrEmpty())
                {
                    User? userFromDb = _db.Users.Where(u => u.Username == user.Username).FirstOrDefault();

                    if (userFromDb == null)
                    {
                        return NotFound();
                    }
                    else if (!BCrypt.Net.BCrypt.Verify(user.Password, userFromDb.Password))
                    {
                        return Unauthorized();
                    }
                    else
                    {
                        (string accessTokenValue, string refreshTokenValue) = _authLibrary.Generate(userFromDb);

                        RefreshToken refreshToken = new()
                        {
                            Value = refreshTokenValue,
                            UserId = userFromDb.Id,
                            ExpirationDate = DateTime.Now.AddDays(7),
                            Revoked = false,
                        };
                        _db.RefreshTokens.Add(refreshToken);
                        _db.SaveChanges();

                        RefreshToken refreshTokenFromDb = _db.RefreshTokens.Where(r => r.Value == refreshTokenValue).First();

                        AccessToken accessToken = new()
                        {
                            Value = accessTokenValue,
                            RtId = refreshTokenFromDb.Id,
                            ExpirationDate = DateTime.Now.AddMinutes(2),
                            Revoked = false,
                        };
                        _db.AccessTokens.Add(accessToken);
                        _db.SaveChanges();

                        // Assign refresh token for cookies
                        Response.Cookies.Append("refreshToken", refreshTokenValue, new CookieOptions()
                        {
                            HttpOnly = true,
                            Secure = true,
                            SameSite = SameSiteMode.None,
                            Expires = DateTime.Now.AddDays(7)
                        });

                        ReturnToken returnToken = new()
                        {
                            AccessToken = accessTokenValue.ToString(),
                            RefreshToken = refreshTokenValue.ToString()
                        };

                        return Ok(returnToken);
                    }
                }
            }

            return BadRequest();
        }
    }
}
