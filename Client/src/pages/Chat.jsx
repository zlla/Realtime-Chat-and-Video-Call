import axios from "axios";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import * as signalR from "@microsoft/signalr";

import { apiUrl } from "../settings/support";
// import Conversation from "../components/Conversation";

function Chat() {
  const navigate = useNavigate();
  const [connection, setConnection] = useState(null);
  const [duoConversationInfoList, setDuoConversationInfoList] = useState([]);
  const [groupConversationInfoList, setGroupConversationInfoList] = useState(
    []
  );

  const [toggleConversation, setToggleConversation] = useState(false);
  const [signalRId, setSignalRId] = useState("");
  const [message, setMessage] = useState("");
  const [isGroup, setIsGroup] = useState(false);

  const [returnConversations, setReturnConversations] = useState([]);
  const [tempMessages, setTempMessages] = useState([]);
  const [tempReceiverName, setTempReceiverName] = useState("");

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
      setDuoConversationInfoList(dataArray);
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
      setGroupConversationInfoList(dataArray);
    } catch (error) {
      console.log(error);
    }
  };

  const fetchAllConversations = async () => {
    const config = {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
      },
    };

    try {
      const response = await axios.get(`${apiUrl}/message/getAll`, config);
      const dataArray = Object.values(response.data);
      setReturnConversations(dataArray);
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
        .then(() => fetchAllConversations())
        .catch((err) => console.error(err.toString()));
    }
  };

  const handleDuoConversation = (receiverName) => {
    setTempMessages([]);

    setIsGroup(false);
    setSignalRId(receiverName);
    setTempReceiverName(receiverName);
    setToggleConversation(true);

    returnConversations.forEach((message) => {
      if (
        message["conversationType"] === "duo" &&
        message["receiverName"] === receiverName &&
        message["messagesDTO"]
      ) {
        setTempMessages(message);
      }
    });
  };

  const handleGrConversation = (signalRId) => {
    setTempMessages([]);
    setTempReceiverName("");

    setIsGroup(true);
    setSignalRId(signalRId);
    setToggleConversation(true);

    returnConversations.forEach((message) => {
      if (
        message["conversationType"] === "group" &&
        message["conversationId"] === signalRId &&
        message["messagesDTO"]
      ) {
        setTempMessages(message);
      }
    });
  };

  const handleConversationClick = (conversation) => {
    if (conversation.conversationType.toLowerCase() === "duo") {
      duoConversationInfoList.forEach((item) => {
        if (item.username === conversation.receiverName) {
          handleDuoConversation(item.username);
        }
      });
    } else if (conversation.conversationType.toLowerCase() === "group") {
      groupConversationInfoList.forEach((item) => {
        if (item.groupId.toString() === conversation.conversationId) {
          handleGrConversation(item.groupId.toString());
        }
      });
    } else {
      return;
    }
  };

  useEffect(() => {
    returnConversations.forEach((message) => {
      if (
        message["conversationType"] === "duo" &&
        message["receiverName"] === tempReceiverName &&
        message["messagesDTO"]
      ) {
        setTempMessages(message);
      } else if (
        message["conversationType"] === "group" &&
        message["conversationId"] === signalRId &&
        message["messagesDTO"]
      ) {
        setTempMessages(message);
      }
    });
  }, [returnConversations, tempReceiverName, signalRId]);

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
    const saveSignalRId = async (SId) => {
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

    if (connection) {
      connection.on("ReceiveMessage", (message) => {
        if (message) {
          fetchAllConversations();
        }
      });

      // connection.on("NewGroup", () => {
      //   fetchAllGroupConversationInfo();
      // });

      connection.on("UserConnected", () => {
        fetchAllDuoConversationInfo();
      });

      // connection.on("UserDisconnected", function (connectionId) {});

      connection
        .start()
        .then(() => {
          saveSignalRId(connection.connectionId);
          fetchAllDuoConversationInfo();
          fetchAllGroupConversationInfo();
          fetchAllConversations();
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

    if (groupConversationInfoList.length > 0) {
      groupConversationInfoList.forEach((group) => {
        handleJoinGroup(group.groupId.toString());
      });
    }
  }, [groupConversationInfoList, connection]);

  return (
    <div>
      <h1>{localStorage.getItem("username")}</h1>

      <hr />
      <h4>People maybe you know!</h4>
      <div>
        {duoConversationInfoList &&
          duoConversationInfoList.map((item) => (
            <div key={item.username}>
              <button
                onClick={() => {
                  setToggleConversation(true);
                  setSignalRId(item.username);
                  setIsGroup(false);
                }}
              >
                {item.username}
              </button>
            </div>
          ))}
      </div>
      <hr />

      <div>
        {returnConversations &&
          returnConversations.map((conversation) => (
            <div key={conversation.conversationId}>
              <button onClick={() => handleConversationClick(conversation)}>
                {conversation.conversationName}
              </button>
            </div>
          ))}
      </div>
      <hr />

      <div>
        {tempMessages &&
          tempMessages["messagesDTO"] &&
          tempMessages["messagesDTO"].map((message) => (
            <div key={message.id}>{message.content}</div>
          ))}
      </div>

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

      {/* <Conversation /> */}

      <button
        onClick={() => {
          navigate("/");
        }}
      >
        Home
      </button>
    </div>
  );
}

export default Chat;
