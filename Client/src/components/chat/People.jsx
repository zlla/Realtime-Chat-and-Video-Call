import { any, array, func } from "prop-types";
import { useState } from "react";
import { Card } from "react-bootstrap";

const People = (props) => {
  const {
    duoConversationInfoList,
    returnConversations,
    setTempConversationId,
    setTempRecentMessageId,
    setTempMessages,
    setSignalRId,
    setIsGroup,
    setTempConversationName,
    setToggleConversation,
    fetchAllMessage,
  } = props;

  const [selectedUser, setSelectedUser] = useState(null);

  const handleMouseEnter = (event) => {
    if (selectedUser !== event.currentTarget) {
      event.currentTarget.style.backgroundColor = "#e9ecef";
    }
  };

  const handleMouseLeave = (event) => {
    if (selectedUser !== event.currentTarget) {
      event.currentTarget.style.backgroundColor = "transparent";
    }
  };

  const handleConversation = async (conversation) => {
    const messageList = await fetchAllMessage(conversation.conversationId);
    setSignalRId(conversation.receiverName);
    setIsGroup(false);
    setTempConversationName(conversation.conversationName);
    setTempMessages(messageList);
    setTempConversationId(conversation.conversationId);
    setTempRecentMessageId(conversation.recentMessageId);
    setToggleConversation(true);
  };

  const handleClick = (event, username) => {
    if (selectedUser) {
      selectedUser.style.backgroundColor = "transparent";
    }
    setSelectedUser(event.currentTarget);

    const foundConversation = returnConversations.find(
      (c) => c.receiverName === username
    );

    if (foundConversation) {
      handleConversation(foundConversation);
    } else {
      setSignalRId(username);
      setIsGroup(false);
      setTempConversationName(username);
      setTempMessages([]);
      setTempConversationId(null);
      setToggleConversation(true);
    }
  };

  return (
    <div>
      {duoConversationInfoList &&
        duoConversationInfoList.map((item) => (
          <Card key={item.username} style={{ border: "none" }}>
            <div
              className={`d-flex align-items-start w-100`}
              onClick={(event) => handleClick(event, item.username)}
              onMouseEnter={(event) => handleMouseEnter(event)}
              onMouseLeave={(event) => handleMouseLeave(event)}
              style={{
                padding: "15px",
                textAlign: "left",
                overflow: "hidden",
                borderRadius: "15px",
                cursor: "pointer",
                transition: "background-color 0.3s ease",
              }}
            >
              <div
                className="conversation-content"
                style={{
                  maxWidth: "96%",
                }}
              >
                <Card.Title
                  className={`my-0`}
                  style={{
                    whiteSpace: "nowrap",
                    fontSize: "16px",
                    fontWeight: "bold",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {item.username}
                </Card.Title>
              </div>
            </div>
          </Card>
        ))}
    </div>
  );
};

People.propTypes = {
  duoConversationInfoList: array,
  returnConversations: array,
  setTempConversationId: any,
  setTempRecentMessageId: any,
  setTempMessages: any,
  setSignalRId: any,
  setIsGroup: any,
  setTempConversationName: any,
  setToggleConversation: any,
  fetchAllMessage: func,
};

export default People;
