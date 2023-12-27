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
            long receiverUserId = 0;
            long senderUserId = 0;
            Conversation? duoConversation = null;

            var receiverRecord = await _db.Users.Where(u => u.Username == receiverId).FirstOrDefaultAsync();
            if (receiverRecord != null)
            {
                receiverUserId = receiverRecord.Id;
            }
            var senderSignalRRecord = await _db.SignalRConnectionIds.Where(s => s.Value == senderId).FirstOrDefaultAsync();
            if (senderSignalRRecord != null)
            {
                senderUserId = senderSignalRRecord.UserId;
            }

            if (receiverUserId != 0 && senderUserId != 0 && receiverUserId != senderUserId)
            {
                List<Participant>? participantReceiverList = await _db.Participants.Where(p => p.UserId == receiverUserId).ToListAsync();
                List<Participant>? participantSenderList = await _db.Participants.Where(p => p.UserId == senderUserId).ToListAsync();
                List<long> sameIdList = new();

                foreach (var itemList1 in participantReceiverList)
                {
                    foreach (var itemList2 in participantSenderList)
                    {
                        if (itemList1.ConversationId == itemList2.ConversationId)
                        {
                            sameIdList.Add(itemList1.ConversationId);
                        }
                    }
                }

                if (sameIdList.Count > 0)
                {
                    List<Conversation> conversationsFromSameIdList = new();
                    foreach (var conversationId in sameIdList)
                    {
                        conversationsFromSameIdList.Add(await _db.Conversations.Where(c => c.Id == conversationId).FirstAsync());
                    }

                    foreach (var conversation in conversationsFromSameIdList)
                    {
                        if (conversation.Participants != null)
                        {
                            if (conversation.Participants.Count == 2 && conversation.ConversationType == "duo")
                            {
                                duoConversation = conversation;
                            }
                        }
                    }
                }

                if (duoConversation != null)
                {
                    Message msgToDb = new()
                    {
                        ConversationId = duoConversation.Id,
                        SenderId = senderUserId,
                        Content = message,
                        SentAt = DateTime.Now,
                        MessageType = "text"
                    };

                    await _db.Messages.AddAsync(msgToDb);
                    await _db.SaveChangesAsync();
                }
                else
                {
                    Conversation newConversation = new Conversation
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

                    var msgToDb = new Message
                    {
                        ConversationId = newConversation.Id,
                        SenderId = senderUserId,
                        Content = message,
                        SentAt = DateTime.Now,
                        MessageType = "text"
                    };

                    await _db.Messages.AddAsync(msgToDb);
                    await _db.SaveChangesAsync();
                }
            }

            SignalRConnectionId? signalRConnectionId = await _db.SignalRConnectionIds
                .Where(s => s.UserId == receiverUserId)
                .OrderByDescending(s => s.CreationTime)
                .FirstOrDefaultAsync();

            if (signalRConnectionId != null)
            {
                return Clients.Client(signalRConnectionId.Value.ToString()).SendAsync("ReceiveMessage", message);
            }

            return Clients.Client(receiverId).SendAsync("ReceiveMessage", message);
        }

        public Task JoinGroup(string group)
        {
            return Groups.AddToGroupAsync(Context.ConnectionId, group);
        }

        public async Task<Task> SendMessageToGroup(string group, string message)
        {
            string senderId = Context.ConnectionId;
            long senderUserId = 0;

            var senderSignalRRecord = await _db.SignalRConnectionIds.Where(s => s.Value == senderId).FirstOrDefaultAsync();
            if (senderSignalRRecord != null)
            {
                senderUserId = senderSignalRRecord.UserId;
            }

            if (senderUserId != 0)
            {
                Conversation? conversation = await _db.Conversations.Where(c => c.Id.ToString() == group).FirstOrDefaultAsync();
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
                }
            }

            return Clients.Group(group).SendAsync("ReceiveMessage", message);
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
