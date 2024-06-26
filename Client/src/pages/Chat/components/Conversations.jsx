import { any, array, func } from "prop-types";
import { Card } from "react-bootstrap";
import { useState } from "react";

import "../styles/conversation.css";

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
    setMyNickname,
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
    setMyNickname(conversation.myNickname);
    setTempMessages(messageList);
    setTempConversationId(conversation.conversationId);
    setTempRecentMessageId(conversation.recentMessageId);
    setToggleConversation(true);
  };

  const handleConversationClick = (conversation) => {
    if (conversation.conversationType.toLowerCase() === "duo") {
      duoConversationInfoList.forEach((d) => {
        if (d.username === conversation.receiverName) {
          handleConversation(conversation, false);
        }
      });
    } else if (conversation.conversationType.toLowerCase() === "group") {
      groupConversationInfoList.forEach((g) => {
        if (g.groupId.toString() === conversation.conversationId) {
          handleConversation(conversation, true);
        }
      });
    } else {
      return;
    }
  };

  const [selectedConversation, setSelectedConversation] = useState(null);

  const handleMouseEnter = (event) => {
    if (selectedConversation !== event.currentTarget) {
      event.currentTarget.style.backgroundColor = "#e9ecef";
    }
  };

  const handleMouseLeave = (event) => {
    if (selectedConversation !== event.currentTarget) {
      event.currentTarget.style.backgroundColor = "transparent";
    }
  };

  const handleClick = (conversation, event) => {
    const clickedConversation = event.currentTarget;

    if (selectedConversation !== clickedConversation) {
      if (selectedConversation) {
        selectedConversation.style.backgroundColor = "transparent";
      }

      clickedConversation.style.backgroundColor = "#e9ecef";
      setSelectedConversation(clickedConversation);
    }

    handleConversationClick(conversation);
  };

  return (
    <div className="conversation-container">
      {returnConversations &&
        returnConversations.map((conversation) => (
          <Card
            key={conversation.conversationId}
            className={`messenger-card`}
            style={{ border: "none" }}
          >
            <div
              className={`d-flex align-items-start w-100`}
              onClick={(event) => handleClick(conversation, event)}
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
                  {conversation.conversationName}
                </Card.Title>
                <Card.Text
                  className={`mb-0`}
                  style={{
                    whiteSpace: "nowrap",
                    fontSize: "14px",
                    color: "#555",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {conversation.recentMessage ??
                    "Start the conversation right now"}
                </Card.Text>
              </div>
            </div>
          </Card>
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
  setMyNickname: any,
  setToggleConversation: any,
  fetchAllMessage: func,
};

export default Conversations;
