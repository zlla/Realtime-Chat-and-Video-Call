using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Server.Models;
using Server.Helpers;
using Server.Auth;
using Microsoft.EntityFrameworkCore;
using Server.Services.Interfaces;

namespace Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [AllowAnonymous]
    public class RegisterController : Controller
    {
        private readonly ApplicationDbContext _db;
        private readonly IAuthLibrary _authLibrary;

        public RegisterController(ApplicationDbContext db, IAuthLibrary authLibrary)
        {
            _db = db;
            _authLibrary = authLibrary;
        }

        [HttpPost]
        public async Task<IActionResult> Register([FromBody] User user)
        {
            // Validate user
            if (user == null)
            {
                return BadRequest();
            }

            // Check exist User
            string? existingEmail = _db.Users.Where(u => u.Email == user.Email).FirstOrDefault()?.Email;
            if (existingEmail != null)
            {
                return BadRequest("This email has already exist!");
            }
            string? existingUsername = _db.Users.Where(u => u.Username == user.Username).FirstOrDefault()?.Username;
            if (existingUsername != null)
            {
                return BadRequest("This username has already exist!");
            }

            string passwordHashed = BCrypt.Net.BCrypt.HashPassword(user.Password);

            User userToDb = new()
            {
                Email = user.Email,
                Username = user.Username,
                Password = passwordHashed,
                Role = "user",
                Name = "",
                AccountCreationDate = DateTime.Now,
                Nationality = ""
            };
            _db.Users.Add(userToDb);
            await _db.SaveChangesAsync();

            User userFromDb = await _db.Users.Where(u => u.Email == user.Email).FirstAsync();

            var token = _authLibrary.Generate(userFromDb);
            if (token is (string at, string rt))
            {
                (string accessTokenValue, string refreshTokenValue) = (at, rt);
                RefreshToken refreshToken = new()
                {
                    Value = refreshTokenValue,
                    UserId = userFromDb.Id,
                    ExpirationDate = DateTime.Now.AddDays(7),
                    Revoked = false,
                };
                _db.RefreshTokens.Add(refreshToken);
                await _db.SaveChangesAsync();

                RefreshToken refreshTokenFromDb = await _db.RefreshTokens.Where(r => r.Value == refreshTokenValue).FirstAsync();

                var accessToken = new AccessToken()
                {
                    Value = accessTokenValue,
                    RtId = refreshTokenFromDb.Id,
                    ExpirationDate = DateTime.Now.AddMinutes(2),
                    Revoked = false,
                };
                _db.AccessTokens.Add(accessToken);
                await _db.SaveChangesAsync();

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
                    RefreshToken = refreshTokenValue.ToString(),
                };

                return Ok(returnToken);
            }

            return BadRequest();
        }
    }
}

