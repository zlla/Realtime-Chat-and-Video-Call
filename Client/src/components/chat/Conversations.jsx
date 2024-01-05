import { any, array, func } from "prop-types";

const Conversations = (props) => {
  const {
    returnConversations,
    duoConversationInfoList,
    groupConversationInfoList,
    setTempConversationId,
    setTempRecentMessageId,
    setTempMessages,
    setSignalRId,
    setIsGroup,
    setTempConversationName,
    setToggleConversation,
    fetchAllMessage,
  } = props;

  const handleConversation = async (conversation, isGroup) => {
    const messageList = await fetchAllMessage(conversation.conversationId);

    if (isGroup) {
      setSignalRId(conversation.conversationId);
    } else {
      setSignalRId(conversation.receiverName);
    }

    setIsGroup(isGroup);
    setTempConversationName(conversation.conversationName);
    setTempMessages(messageList);
    setTempConversationId(conversation.conversationId);
    setTempRecentMessageId(conversation.recentMessageId);
    setToggleConversation(true);
  };

  const handleConversationClick = (conversation) => {
    if (conversation.conversationType.toLowerCase() === "duo") {
      duoConversationInfoList.forEach((item) => {
        if (item.username === conversation.receiverName) {
          handleConversation(conversation, false);
        }
      });
    } else if (conversation.conversationType.toLowerCase() === "group") {
      groupConversationInfoList.forEach((item) => {
        if (item.groupId.toString() === conversation.conversationId) {
          handleConversation(conversation, true);
        }
      });
    } else {
      return;
    }
  };

  return (
    <div>
      {returnConversations &&
        returnConversations.map((conversation) => (
          <div key={conversation.conversationId}>
            <button onClick={() => handleConversationClick(conversation)}>
              <h5>{conversation.conversationName}</h5>
              <p>{conversation.recentMessage}</p>
            </button>
          </div>
        ))}
    </div>
  );
};

Conversations.propTypes = {
  returnConversations: array,
  duoConversationInfoList: array,
  groupConversationInfoList: array,
  setTempConversationId: any,
  setTempRecentMessageId: any,
  setTempMessages: any,
  setSignalRId: any,
  setIsGroup: any,
  setTempConversationName: any,
  setToggleConversation: any,
  fetchAllMessage: func,
};

export default Conversations;
