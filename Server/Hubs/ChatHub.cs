using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Server.Helpers;
using Server.Models;

namespace Server.Hubs
{
    public class ChatHub : Hub
    {
        private readonly ApplicationDbContext _db;

        public ChatHub(ApplicationDbContext db)
        {
            _db = db;
        }

        public Task SendMessageToAll(string message)
        {
            return Clients.All.SendAsync("ReceiveMessage", message);
        }

        public Task SendMessageToCaller(string message)
        {
            return Clients.Caller.SendAsync("ReceiveMessage", message);
        }

        public async Task<Task> SendMessageToUser(string receiverId, string message)
        {
            string senderId = Context.ConnectionId;
            Conversation? duoConversation = null;

            User? receiverRecord = await _db.Users
                .Where(u => u.Username == receiverId)
                .FirstOrDefaultAsync();
            SignalRConnectionId? senderSignalRRecord = await _db.SignalRConnectionIds
                .Where(s => s.Value == senderId)
                .FirstOrDefaultAsync();

            long receiverUserId = receiverRecord?.Id ?? 0;
            long senderUserId = senderSignalRRecord?.UserId ?? 0;

            if (receiverUserId != 0 && senderUserId != 0 && receiverUserId != senderUserId)
            {
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
                            ConversationId = newConversation.Id,
                            JoinedAt = DateTime.Now
                        },
                        new() {
                            UserId = senderUserId,
                            ConversationId = newConversation.Id,
                            JoinedAt = DateTime.Now
                        }
                    };

                    await _db.Participants.AddRangeAsync(participants);
                    await _db.SaveChangesAsync();

                    conversationId = newConversation.Id;
                }

                var msgToDb = new Message
                {
                    ConversationId = conversationId,
                    SenderId = senderUserId,
                    Content = message,
                    SentAt = DateTime.Now,
                    MessageType = "text"
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

            return Task.CompletedTask;
        }

        public Task JoinGroup(string group)
        {
            return Groups.AddToGroupAsync(Context.ConnectionId, group);
        }

        public async Task<Task> SendMessageToGroup(string group, string message)
        {
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
                    Message msgToDb = new()
                    {
                        ConversationId = conversation.Id,
                        SenderId = senderUserId,
                        Content = message,
                        SentAt = DateTime.Now,
                        MessageType = "text"
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
