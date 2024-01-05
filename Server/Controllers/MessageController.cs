using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Server.Auth;
using Server.Helpers;

namespace Server.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/message")]
    public class MessageController : Controller
    {
        private readonly ApplicationDbContext _db;
        private readonly AuthLibrary _authLibrary;

        public MessageController(ApplicationDbContext db, AuthLibrary authLibrary)
        {
            _db = db;
            _authLibrary = authLibrary;
        }

        [HttpGet("getAll/{ConversationId}")]
        public async Task<IActionResult> GetAllMessages([FromRoute] long ConversationId)
        {
            var conversation = await _db.Conversations.Where(c => c.Id == ConversationId).FirstOrDefaultAsync();

            if (conversation != null)
            {
                var messagesDTO = await _db.Messages
                    .Where(m => m.ConversationId == conversation.Id)
                    .Select(m => new MessageDTO
                    {
                        Id = m.Id,
                        SenderId = m.SenderId,
                        Content = m.Content,
                        SendAt = m.SentAt,
                        MessageType = m.MessageType
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
        public required string Content { get; set; }
        public required DateTime SendAt { get; set; }
        public required string MessageType { get; set; }
    }
}