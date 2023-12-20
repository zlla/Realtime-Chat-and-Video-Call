import axios from "axios";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import * as signalR from "@microsoft/signalr";

import { apiUrl } from "../settings/support";
import Conversation from "../components/Conversation";

function Chat() {
  const navigate = useNavigate();
  const [connection, setConnection] = useState();
  const [userAndSignalRIdList, setUserAndSignalRIdList] = useState([]);
  const [groupList, setGroupList] = useState([]);
  const [toggleConversation, setToggleConversation] = useState(false);
  const [signalRId, setSignalRId] = useState("");
  const [message, setMessage] = useState("");
  const [isGroup, setIsGroup] = useState(false);

  const saveSignalRsId = async (SId) => {
    const config = {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
      },
    };

    const bodyParameters = {
      SId: SId,
    };

    try {
      await axios.post(
        `${apiUrl}/chatHub/saveSignalRId`,
        bodyParameters,
        config
      );
    } catch (error) {
      console.log(error);
    }
  };

  const fetchAllDuoConversationInfo = async () => {
    const config = {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
      },
    };

    try {
      const response = await axios.get(
        `${apiUrl}/chatHub/getAllDuoConversationInfo`,
        config
      );
      const dataArray = Object.values(response.data);
      setUserAndSignalRIdList(dataArray);
    } catch (error) {
      console.log(error);
    }
  };

  const fetchAllGroupConversationInfo = async () => {
    const config = {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
      },
    };

    try {
      const response = await axios.get(
        `${apiUrl}/chatHub/getAllGroupConversationInfo`,
        config
      );
      const dataArray = Object.values(response.data);
      setGroupList(dataArray);
    } catch (error) {
      console.log(error);
    }
  };

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
        .catch((err) => console.error(err.toString()));
    }
  };

  useEffect(() => {
    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${apiUrl}/chatHub`)
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

      connection.on("UserConnected", function () {
        fetchAllDuoConversationInfo();
      });

      connection.on("NewGroup", function () {
        fetchAllGroupConversationInfo();
      });

      // connection.on("UserDisconnected", function (connectionId) {
      //   var groupElement = document.getElementById("group");
      //   for (var i = 0; i < groupElement.length; i++) {
      //     if (groupElement.options[i].value === connectionId) {
      //       groupElement.remove(i);
      //     }
      //   }
      // });

      connection
        .start()
        .then(() => {
          saveSignalRsId(connection.connectionId);
          fetchAllDuoConversationInfo();
          fetchAllGroupConversationInfo();
        })
        .catch((err) => console.error(err.toString()));
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

  useEffect(() => {
    const handleJoinGroup = (groupName) => {
      if (connection && connection.state === "Connected") {
        connection
          .invoke("JoinGroup", groupName)
          .catch((err) => console.error(err.toString()));
      }
    };

    if (groupList.length > 0) {
      groupList.forEach((group) => {
        handleJoinGroup(group.groupId.toString());
      });
    }
  }, [groupList, connection]);

  return (
    <div>
      <h1>{localStorage.getItem("username")}</h1>
      <div>
        {userAndSignalRIdList.map((item) => (
          <div key={item.username}>
            <button
              onClick={() => {
                setSignalRId(item.signalRId);
                setIsGroup(false);
                setToggleConversation(true);
              }}
            >
              {item.username}
            </button>
          </div>
        ))}
        <hr />
      </div>
      <div>
        {groupList.map((item) => (
          <div key={item.groupId}>
            <button
              onClick={() => {
                setSignalRId(item.groupId.toString());
                setIsGroup(true);
                setToggleConversation(true);
              }}
            >
              {item.groupName}
            </button>
          </div>
        ))}
      </div>

      {toggleConversation && (
        <div>
          <button onClick={() => setToggleConversation(false)}>Close</button>
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

      {/* <div id="messages"></div> */}
      <Conversation />

      <button
        onClick={() => {
          navigate("/");
        }}
      >
        home
      </button>
    </div>
  );
}

export default Chat;
