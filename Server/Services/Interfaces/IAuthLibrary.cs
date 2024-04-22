using System.Security.Claims;
using Server.Models;

namespace Server.Services.Interfaces
{
    public interface IAuthLibrary
    {
        object Generate(User user, bool includeRefreshToken = true);
        ClaimsPrincipal? Validate(string accessToken, bool validateLifetimeParam = false);
    }
}