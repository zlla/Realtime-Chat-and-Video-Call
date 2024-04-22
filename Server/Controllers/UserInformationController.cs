using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Server.Auth;
using Server.Helpers;
using Server.Hubs;
using Server.Services.Interfaces;

namespace Server.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/userInfo")]
    public class UserInformationController : Controller
    {
        private readonly ApplicationDbContext _db;
        private readonly IAuthLibrary _authLibrary;
        private readonly IHubContext<ChatHub> _hubContext;

        public UserInformationController(ApplicationDbContext db, IAuthLibrary authLibrary, IHubContext<ChatHub> hubContext)
        {
            _db = db;
            _authLibrary = authLibrary;
            _hubContext = hubContext;
        }

        [HttpGet("test")]
        public IActionResult Test()
        {
            _hubContext.Clients.Client("123").SendAsync("ReceiveMessage", "message");
            return Ok();
        }
    }
}