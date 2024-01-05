import { any, array, bool, func, string } from "prop-types";
import { useState } from "react";

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

  const sendMessage = (message, id, isGroup) => {
    if (!connection) return;

    if (isGroup) {
      connection
        .invoke("SendMessageToGroup", id, message)
        .catch((err) => console.error(err.toString()));

      return;
    }

    if (id === "All" || id === "Myself") {
      const method = id === "All" ? "SendMessageToAll" : "SendMessageToCaller";
      connection
        .invoke(method, message)
        .catch((err) => console.error(err.toString()));
    } else {
      connection
        .invoke("SendMessageToUser", id, message)
        .then(() => fetchAllConversations())
        .catch((err) => console.error(err.toString()));
    }
  };

  return (
    <div>
      {tempMessages && tempConversationName && (
        <div>
          <h4>{tempConversationName}</h4>
          {tempMessages.map((message) => (
            <div key={message.id}>{message.content}</div>
          ))}
        </div>
      )}
      {toggleConversation && (
        <div>
          <br />
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <button
            onClick={() => {
              sendMessage(message, signalRId, isGroup);
              setMessage("");
            }}
          >
            Send
          </button>
        </div>
      )}
    </div>
  );
};

SelectedConversation.propTypes = {
  tempMessages: array,
  tempConversationName: string,
  toggleConversation: bool,
  signalRId: string,
  isGroup: bool,
  connection: any,
  fetchAllConversations: func,
};

export default SelectedConversation;
