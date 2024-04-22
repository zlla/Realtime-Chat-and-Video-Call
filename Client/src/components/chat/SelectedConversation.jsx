import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { FaPhone, FaVideo, FaPaperPlane } from "react-icons/fa";

import "../../styles/ComponentStyles/SelectedConversation.css";

const SelectedConversation = (props) => {
  const {
    tempMessages,
    tempConversationName,
    toggleConversation,
    signalRId,
    isGroup,
    connection,
    fetchAllConversations,
  } = props;

  const [message, setMessage] = useState("");
  const [username, setUsername] = useState("");
  const messagesEndRef = useRef(null);

  const sendMessage = (message, id, isGroup) => {
    if (!connection) return;

    if (isGroup) {
      connection
        .invoke("SendMessageToGroup", id, message)
        .catch((err) => console.error(err.toString()));

      return;
    }

    const method = id === "All" ? "SendMessageToAll" : "SendMessageToUser";

    connection
      .invoke(method, id, message)
      .then(() => {
        fetchAllConversations();
      })
      .catch((err) => console.error(err.toString()));
  };

  useEffect(() => {
    const storedUsername = localStorage.getItem("username");
    setUsername(storedUsername);
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
    }
  }, [tempMessages]);

  return (
    <div className="messenger-container">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h4>{tempConversationName}</h4>
        {toggleConversation && (
          <div className="button-container">
            <button className="btn btn-light mr-2 rounded-circle-btn">
              <FaPhone className="call-icon" />
            </button>
            <button className="btn btn-light rounded-circle-btn">
              <FaVideo className="call-icon" />
            </button>
          </div>
        )}
      </div>

      <div
        className="messages-container"
        style={{
          display: "flex",
          flexDirection: "column-reverse",
          height: "100%",
          overflowY: "auto",
        }}
      >
        {tempMessages
          .slice()
          .reverse()
          .map((message) => {
            if (message.messageType === "text") {
              return (
                <div
                  key={message.id}
                  className={`message-container d-flex ${
                    message.senderName === username
                      ? "justify-content-end"
                      : "justify-content-start"
                  }`}
                >
                  <div
                    className={`message ${
                      message.senderName === username
                        ? "my-message"
                        : "other-message"
                    }`}
                    ref={messagesEndRef}
                  >
                    {message.content}
                  </div>
                </div>
              );
            } else if (message.messageType === "settings-conversationName") {
              return (
                <div key={message.id} className="settings-container">
                  <span className="settings-message">{message.content}</span>
                </div>
              );
            }
          })}
      </div>

      {toggleConversation && (
        <div className="input-container" style={{ width: "80%" }}>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyUp={(e) => {
              if (e.key === "Enter" && !e.repeat) {
                e.preventDefault();
                sendMessage(message, signalRId, isGroup);
                setMessage("");
              }
            }}
            className="form-control mb-2"
            placeholder="Type your message"
          />
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => {
              sendMessage(message, signalRId, isGroup);
              setMessage("");
            }}
          >
            <FaPaperPlane className="send-icon" />{" "}
          </button>
        </div>
      )}
    </div>
  );
};

SelectedConversation.propTypes = {
  tempMessages: PropTypes.array,
  tempConversationName: PropTypes.string,
  toggleConversation: PropTypes.bool,
  signalRId: PropTypes.string,
  isGroup: PropTypes.bool,
  connection: PropTypes.any,
  fetchAllConversations: PropTypes.func,
};

export default SelectedConversation;
