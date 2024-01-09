import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { FaPaperPlane } from "react-icons/fa";

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
        scrollToBottom();
      })
      .catch((err) => console.error(err.toString()));
  };

  useEffect(() => {
    const storedUsername = localStorage.getItem("username");
    setUsername(storedUsername);
  }, []);

  useEffect(() => {
    // Scroll to the bottom when new messages are added
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [tempMessages]);

  return (
    <div className="messenger-container">
      <h4>{tempConversationName}</h4>
      <div className="messages-container">
        {tempMessages.map((message) => (
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
                message.senderName === username ? "my-message" : "other-message"
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} /> {/* Ref for scrolling to the bottom */}
      </div>
      {toggleConversation && (
        <div className="input-container" style={{ width: "80%" }}>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="form-control mb-2"
            placeholder="Type your message"
          />
          <button
            onClick={() => {
              sendMessage(message, signalRId, isGroup);
              setMessage("");
            }}
            className="btn btn-primary"
          >
            <FaPaperPlane className="send-icon" />
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
