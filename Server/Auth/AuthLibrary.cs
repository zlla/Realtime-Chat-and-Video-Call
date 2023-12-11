using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Server.Models;

namespace Server.Auth
{
    public class AuthLibrary
    {
        private readonly IConfiguration _configuration;

        public AuthLibrary(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public object Generate(User user, bool includeRefreshToken = true)
        {
            // Create the claims for the JWT
            var claims = new[]
            {
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Name, user.Username),
                //new Claim(ClaimTypes.Role, "Admin")
            };

            // Get the secret key from the appsettings.json file
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["JwtBearer:Key"]));
            // Create the signing credentials using the secret key
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            // Create the JWT token
            var token = new JwtSecurityToken(
                issuer: _configuration["JwtBearer:Issuer"],
                audience: _configuration["JwtBearer:Audience"],
                claims: claims,
                expires: DateTime.Now.AddMinutes(2),
                signingCredentials: creds);

            string at = new JwtSecurityTokenHandler().WriteToken(token);

            if (includeRefreshToken)
            {
                // Create the refresh token
                var rt = Guid.NewGuid().ToString();
                return (at, rt);
            }

            return at;
        }

        public ClaimsPrincipal? Validate(string accessToken, bool validateLifetimeParam = false)
        {
            // Check if the access token is null or empty
            if (string.IsNullOrEmpty(accessToken))
            { return null; }

            // Create a token validation parameters object with the JWT settings from the appsettings.json file
            var tokenValidationParameters = new TokenValidationParameters()
            {
                ValidateIssuer = true,
                ValidIssuer = _configuration["JwtBearer:Issuer"],
                ValidateAudience = true,
                ValidAudience = _configuration["JwtBearer:Audience"],
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["JwtBearer:Key"])),
                ValidateLifetime = validateLifetimeParam,
                ClockSkew = TimeSpan.Zero
            };

            // Create a JWT security token handler object
            var jwtSecurityTokenHandler = new JwtSecurityTokenHandler();

            // Try to validate the access token and return the principal object that represents the user's identity
            try
            {
                var principal = jwtSecurityTokenHandler.ValidateToken(accessToken, tokenValidationParameters, out var securityToken);
                return principal;
            }
            catch (Exception)
            {
                // Handle the exception or return null
                return null!;
            }
        }
    }
}

