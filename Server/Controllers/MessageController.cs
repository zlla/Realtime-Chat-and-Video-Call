using System.Data.SqlTypes;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Server.Auth;
using Server.Helpers;
using Server.Models;
using Server.Services.Interfaces;

namespace Server.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/message")]
    public class MessageController : Controller
    {
        private readonly ApplicationDbContext _db;
        private readonly IAuthLibrary _authLibrary;

        public MessageController(ApplicationDbContext db, IAuthLibrary authLibrary)
        {
            _db = db;
            _authLibrary = authLibrary;
        }

        [HttpGet("getAll/{conversationId}")]
        public async Task<IActionResult> GetAllMessages([FromRoute] long conversationId)
        {
            var conversation = await _db.Conversations.Where(c => c.Id == conversationId).FirstOrDefaultAsync();

            if (conversation != null)
            {
                var messagesDTO = await _db.Messages
                    .Where(m => m.ConversationId == conversation.Id)
                    .Join(_db.Users, m => m.SenderId, u => u.Id, (m, u) => new
                    {
                        Message = m,
                        User = u
                    })
                    .Select(result => new MessageDTO
                    {
                        Id = result.Message.Id,
                        SenderName = result.User.Username,
                        SenderId = result.Message.SenderId,
                        Content = result.Message.Content,
                        SendAt = result.Message.SentAt,
                        MessageType = result.Message.MessageType
                    })
                    .ToListAsync();


                return Ok(messagesDTO);
            }

            return BadRequest("Conversation not found");
        }

    }

    public class MessageDTO
    {
        public required long Id { get; set; }
        public required long SenderId { get; set; }
        public required string SenderName { get; set; }
        public required string Content { get; set; }
        public required DateTime SendAt { get; set; }
        public required string MessageType { get; set; }
    }
}