using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Server.Helpers;
using Server.Models;

namespace Server.Hubs
{
    public class ChatHub : Hub
    {
        private readonly ApplicationDbContext _db;
        private readonly IWebHostEnvironment _hostingEnvironment;

        public ChatHub(ApplicationDbContext db, IWebHostEnvironment hostingEnvironment)
        {
            _db = db;
            _hostingEnvironment = hostingEnvironment;
        }

        private string HandleImageMessage(string conversationId, string message)
        {
            string uploadImageFolder = Path.Combine(_hostingEnvironment.WebRootPath, "Uploads");
            string conversationImageFolder = Path.Combine(_hostingEnvironment.WebRootPath, $"Images/{conversationId}");

            if (!Directory.Exists(conversationImageFolder))
            {
                Directory.CreateDirectory(conversationImageFolder);
            }
            string sourceImagePath = Path.Combine(uploadImageFolder, message);
            string destinationImagePath = Path.Combine(conversationImageFolder, message);

            File.Move(sourceImagePath, destinationImagePath, true);

            return $"Images/{conversationId}/{message}";
        }

        public Task SendMessageToAll(string message)
        {
            return Clients.All.SendAsync("ReceiveMessage", message);
        }

        public Task SendMessageToCaller(string message)
        {
            return Clients.Caller.SendAsync("ReceiveMessage", message);
        }

        public async Task<Task> SendMessageToUser(string receiverId, string message, string messageType)
        {
            if (string.IsNullOrEmpty(message) || string.IsNullOrWhiteSpace(message)) return Task.CompletedTask;

            string senderId = Context.ConnectionId;
            Conversation? duoConversation = null;

            User? senderRecord;
            SignalRConnectionId? senderSignalRRecord = await _db.SignalRConnectionIds
                .Where(s => s.Value == senderId)
                .FirstOrDefaultAsync();

            if (senderSignalRRecord != null)
            {
                User? receiverRecord = await _db.Users.Where(u => u.Username == receiverId).FirstOrDefaultAsync();
                senderRecord = await _db.Users.Where(u => u.Id == senderSignalRRecord.UserId).FirstOrDefaultAsync();

                if (receiverRecord != null && senderRecord != null && receiverRecord != senderRecord)
                {
                    long receiverUserId = receiverRecord.Id;
                    long senderUserId = senderRecord.Id;
                    List<Participant> participantReceiverList = await _db.Participants
                        .Where(p => p.UserId == receiverUserId)
                        .ToListAsync();

                    List<Participant> participantSenderList = await _db.Participants
                        .Where(p => p.UserId == senderUserId)
                        .ToListAsync();

                    List<long> sameIdList = participantReceiverList
                        .Select(pr => pr.ConversationId)
                        .Intersect(participantSenderList.Select(ps => ps.ConversationId))
                        .ToList();

                    if (sameIdList.Count > 0)
                    {
                        List<Conversation> conversationsFromSameIdList = await _db.Conversations
                            .Where(c => sameIdList.Contains(c.Id))
                            .ToListAsync();

                        duoConversation = conversationsFromSameIdList
                            .FirstOrDefault(c => c.Participants?.Count == 2 && c.ConversationType == "duo");
                    }

                    long conversationId;
                    if (duoConversation != null)
                    {
                        conversationId = duoConversation.Id;
                    }
                    else
                    {
                        Conversation newConversation = new()
                        {
                            ConversationType = "duo",
                            CreatedAt = DateTime.Now
                        };

                        await _db.Conversations.AddAsync(newConversation);
                        await _db.SaveChangesAsync();

                        var participants = new List<Participant>
                    {
                        new() {
                            UserId = receiverUserId,
                            ParticipantName = receiverRecord.Username,
                            ConversationId = newConversation.Id,
                            JoinedAt = DateTime.Now
                        },
                        new() {
                            UserId = senderUserId,
                            ParticipantName = senderRecord.Username,
                            ConversationId = newConversation.Id,
                            JoinedAt = DateTime.Now
                        }
                    };

                        await _db.Participants.AddRangeAsync(participants);
                        await _db.SaveChangesAsync();

                        conversationId = newConversation.Id;
                    }

                    if (messageType == "image")
                    {
                        message = HandleImageMessage(conversationId.ToString(), message);
                    }

                    var msgToDb = new Message
                    {
                        ConversationId = conversationId,
                        SenderId = senderUserId,
                        Content = message,
                        SentAt = DateTime.Now,
                        MessageType = messageType
                    };

                    await _db.Messages.AddAsync(msgToDb);
                    await _db.SaveChangesAsync();

                    SignalRConnectionId? signalRConnectionId = await _db.SignalRConnectionIds
                        .Where(s => s.UserId == receiverUserId)
                        .OrderByDescending(s => s.CreationTime)
                        .FirstOrDefaultAsync();

                    if (signalRConnectionId != null)
                    {
                        await Clients.Client(signalRConnectionId.Value.ToString()).SendAsync("ReceiveMessage", message);
                    }
                }
            }

            return Task.CompletedTask;
        }

        public async Task<Task> CreateDuoCallConnection(string receiverId)
        {
            string senderId = Context.ConnectionId;

            User? receiverRecord = await _db.Users.Where(u => u.Username == receiverId).FirstOrDefaultAsync();

            if (receiverRecord != null)
            {
                long receiverUserId = receiverRecord.Id;

                SignalRConnectionId? signalRConnectionId = await _db.SignalRConnectionIds
                    .Where(s => s.UserId == receiverUserId)
                    .OrderByDescending(s => s.CreationTime)
                    .FirstOrDefaultAsync();

                if (signalRConnectionId != null)
                {
                    await Clients.Client(signalRConnectionId.Value.ToString()).SendAsync("CreateDuoCallConnection", senderId);
                }
            }

            return Task.CompletedTask;
        }

        public async Task<Task> AcceptDuoCallConnection(string receiverId)
        {
            await Clients.Client(receiverId).SendAsync("AcceptDuoCallConnection");

            return Task.CompletedTask;
        }

        public async Task<Task> RejectDuoCallConnection(string receiverId)
        {
            await Clients.Client(receiverId).SendAsync("RejectDuoCallConnection");

            return Task.CompletedTask;
        }

        public async Task<Task> OfferDuoCall(string receiverId, string offer)
        {
            string senderId = Context.ConnectionId;

            User? senderRecord;
            SignalRConnectionId? senderSignalRRecord = await _db.SignalRConnectionIds
                .Where(s => s.Value == senderId)
                .FirstOrDefaultAsync();

            if (senderSignalRRecord != null)
            {
                senderRecord = await _db.Users.Where(u => u.Id == senderSignalRRecord.UserId).FirstOrDefaultAsync();

                User? receiverRecord = await _db.Users.Where(u => u.Username == receiverId).FirstOrDefaultAsync();

                if (receiverRecord != null && senderRecord != null)
                {
                    long receiverUserId = receiverRecord.Id;

                    SignalRConnectionId? signalRConnectionId = await _db.SignalRConnectionIds
                        .Where(s => s.UserId == receiverUserId)
                        .OrderByDescending(s => s.CreationTime)
                        .FirstOrDefaultAsync();

                    if (signalRConnectionId != null)
                    {
                        await Clients.Client(signalRConnectionId.Value.ToString()).SendAsync("DuoCallOffer", offer, senderId);
                    }
                }
            }

            return Task.CompletedTask;
        }

        public async Task<Task> AnswerDuoCall(string requestId, string answer)
        {
            await Clients.Client(requestId).SendAsync("DuoCallAnswer", answer);

            return Task.CompletedTask;
        }

        public async Task<Task> SendIceCandidate(string receiverId, string iceCandidate)
        {
            User? receiverRecord = await _db.Users.Where(u => u.Username == receiverId).FirstOrDefaultAsync();

            if (receiverRecord != null)
            {
                long receiverUserId = receiverRecord.Id;

                SignalRConnectionId? signalRConnectionId = await _db.SignalRConnectionIds
                    .Where(s => s.UserId == receiverUserId)
                    .OrderByDescending(s => s.CreationTime)
                    .FirstOrDefaultAsync();

                if (signalRConnectionId != null)
                {
                    await Clients.Client(signalRConnectionId.Value.ToString()).SendAsync("NewIceCandidate", iceCandidate);
                }
            }

            return Task.CompletedTask;
        }

        public Task JoinGroup(string group)
        {
            return Groups.AddToGroupAsync(Context.ConnectionId, group);
        }

        public async Task<Task> SendMessageToGroup(string group, string message, string messageType)
        {
            if (string.IsNullOrEmpty(message) || string.IsNullOrWhiteSpace(message)) return Task.CompletedTask;

            string senderId = Context.ConnectionId;

            var senderSignalRRecord = await _db.SignalRConnectionIds
                .Where(s => s.Value == senderId)
                .FirstOrDefaultAsync();

            long senderUserId = senderSignalRRecord?.UserId ?? 0;

            if (senderUserId != 0)
            {
                Conversation? conversation = await _db.Conversations
                    .Where(c => c.Id.ToString() == group)
                    .FirstOrDefaultAsync();

                if (conversation != null)
                {

                    if (messageType == "image")
                    {
                        message = HandleImageMessage(conversation.Id.ToString(), message);
                    }

                    Message msgToDb = new()
                    {
                        ConversationId = conversation.Id,
                        SenderId = senderUserId,
                        Content = message,
                        SentAt = DateTime.Now,
                        MessageType = messageType
                    };

                    await _db.Messages.AddAsync(msgToDb);
                    await _db.SaveChangesAsync();

                    await Clients.Group(group).SendAsync("ReceiveMessage", message);
                }
            }

            return Task.CompletedTask;
        }

        public override async Task OnConnectedAsync()
        {
            await Clients.All.SendAsync("UserConnected");
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception ex)
        {
            await Clients.All.SendAsync("UserDisconnected", Context.ConnectionId);
            await base.OnDisconnectedAsync(ex);
        }
    }
}
