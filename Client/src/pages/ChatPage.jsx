import { useEffect, useState } from "react";
import * as signalR from "@microsoft/signalr";

function ChatPage() {
  const [connection, setConnection] = useState(null);

  useEffect(() => {
    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl("http://localhost:5145/chathub")
      .build();

    setConnection(newConnection);

    return () => {
      // Cleanup: Stop the connection when the component is unmounted
      if (newConnection) {
        newConnection.stop().catch((err) => console.error(err.toString()));
      }
    };
  }, []);

  useEffect(() => {
    if (connection) {
      connection.on("ReceiveMessage", function (message) {
        var msg = message
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
        var div = document.createElement("div");
        div.innerHTML = msg + "<hr/>";
        document.getElementById("messages").appendChild(div);
      });

      connection.on("UserConnected", function (connectionId) {
        var groupElement = document.getElementById("group");
        var option = document.createElement("option");
        option.text = connectionId;
        option.value = connectionId;
        groupElement.add(option);
      });

      connection.on("UserDisconnected", function (connectionId) {
        var groupElement = document.getElementById("group");
        for (var i = 0; i < groupElement.length; i++) {
          if (groupElement.options[i].value === connectionId) {
            groupElement.remove(i);
          }
        }
      });

      connection.start().catch((err) => console.error(err.toString()));
    }

    // Cleanup: Remove event listeners when the component is unmounted
    return () => {
      if (connection) {
        connection.off("ReceiveMessage");
        connection.off("UserConnected");
        connection.off("UserDisconnected");
      }
    };
  }, [connection]);

  const sendMessage = (message, groupValue) => {
    if (!connection) return;

    if (groupValue === "All" || groupValue === "Myself") {
      const method =
        groupValue === "All" ? "SendMessageToAll" : "SendMessageToCaller";
      connection
        .invoke(method, message)
        .catch((err) => console.error(err.toString()));
    } else if (groupValue === "PrivateGroup") {
      connection
        .invoke("SendMessageToGroup", "PrivateGroup", message)
        .catch((err) => console.error(err.toString()));
    } else {
      connection
        .invoke("SendMessageToUser", groupValue, message)
        .catch((err) => console.error(err.toString()));
    }
  };

  const handleSendButtonClick = () => {
    const message = document.getElementById("message").value;
    const groupElement = document.getElementById("group");
    const groupValue = groupElement.options[groupElement.selectedIndex].value;

    sendMessage(message, groupValue);
  };

  const handleJoinGroupClick = () => {
    if (connection) {
      connection
        .invoke("JoinGroup", "PrivateGroup")
        .catch((err) => console.error(err.toString()));
    }
  };

  return (
    <div>
      <div>
        <input
          type="button"
          onClick={handleJoinGroupClick}
          value="Join Private Group"
        />
      </div>

      <textarea name="message" id="message"></textarea>
      <br />
      <select id="group">
        <option value="All">Everyone</option>
        <option value="Myself">Myself</option>
        <option value="PrivateGroup">Private Group</option>
      </select>
      <input
        type="button"
        onClick={handleSendButtonClick}
        value="Send Message"
      />

      <div id="messages"></div>
    </div>
  );
}

export default ChatPage;
