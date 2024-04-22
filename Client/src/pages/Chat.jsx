import axios from "axios";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import * as signalR from "@microsoft/signalr";
import "bootstrap/dist/css/bootstrap.min.css";
import { Button, Container, Row, Col } from "react-bootstrap";
import { FaUserFriends, FaComments, FaPlus, FaCog } from "react-icons/fa";

import "../styles/page/Chat.css";
import { apiUrl } from "../settings/support";
import NewConversation from "../components/chat/NewConversation";
import Conversations from "../components/chat/Conversations";
import SelectedConversation from "../components/chat/SelectedConversation";
import People from "../components/chat/People";
import ConversationSettings from "../components/chat/ConversationSettings";

function Chat() {
  const navigate = useNavigate();
  const [connection, setConnection] = useState(null);
  const [duoConversationInfoList, setDuoConversationInfoList] = useState([]);
  const [groupConversationInfoList, setGroupConversationInfoList] = useState(
    []
  );

  const [toggleConversation, setToggleConversation] = useState(false);
  const [signalRId, setSignalRId] = useState("");
  const [isGroup, setIsGroup] = useState(false);

  const [returnConversations, setReturnConversations] = useState([]);
  const [tempMessages, setTempMessages] = useState([]);
  const [tempConversationId, setTempConversationId] = useState("");
  const [tempRecentMessageId, setTempRecentMessageId] = useState("");
  const [tempConversationName, setTempConversationName] = useState("");
  const [myNickname, setMyNickname] = useState("");

  const [activeTab, setActiveTab] = useState("conversation");

  const handleTabChange = (tab) => {
    setActiveTab(tab);
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
      const response = await axios.get(`${apiUrl}/conversation/getAll`, config);
      const dataArray = Object.values(response.data);
      setReturnConversations(dataArray);
    } catch (error) {
      console.log(error);
    }
  };

  const fetchAllMessage = async (conversationId) => {
    const config = {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
      },
    };

    try {
      const response = await axios.get(
        `${apiUrl}/message/getAll/${conversationId}`,
        config
      );
      const dataArray = Object.values(response.data);
      return dataArray;
    } catch (error) {
      console.log(error);
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

      connection.on("NewGroup", () => {
        fetchAllGroupConversationInfo();
        fetchAllConversations();
      });

      connection.on("ChangeConversationName", () => {
        fetchAllConversations();
      });

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

  useEffect(() => {
    const lazyLoadCurrentConversation = async () => {
      if (tempConversationId !== "") {
        returnConversations.forEach(async (conversation) => {
          if (
            conversation.conversationId === tempConversationId &&
            conversation.recentMessageId !== tempRecentMessageId
          ) {
            const messageList = await fetchAllMessage(tempConversationId);
            setTempMessages(messageList);
          }

          if (conversation.conversationId.toString() === tempConversationId) {
            setTempConversationName(conversation.conversationName);
            if (conversation.conversationType == "duo") {
              setMyNickname(conversation.myNickname);
            }
          }
        });
      }
    };

    lazyLoadCurrentConversation();
  }, [
    connection,
    tempConversationId,
    returnConversations,
    tempRecentMessageId,
  ]);

  useEffect(() => {
    const foundConversation = returnConversations.find(
      (c) => c.conversationType === "duo" && c.receiverName === signalRId
    );
    if (foundConversation) {
      setTempConversationId(foundConversation.conversationId);
    }
  }, [returnConversations, signalRId]);

  return (
    <Container fluid>
      <Button
        style={{ marginTop: "20px" }}
        variant="primary"
        onClick={() => {
          navigate("/");
        }}
      >
        Home
      </Button>

      <Row className="border-vertical">
        {/* Left Navbar (Part 1) */}
        <Col sm={12} md={1} className="navbar-col text-center">
          <div className="flex-column px-3 rounded custom-nav-container">
            <div
              className={`d-flex align-items-center custom-link ${
                activeTab === "newConversation" && "active"
              }`}
              onClick={() => handleTabChange("newConversation")}
            >
              <FaPlus size={35} className="mx-auto" />
              {/* <div>New Chat</div> */}
            </div>
            <div
              className={`d-flex align-items-center custom-link ${
                activeTab === "conversation" && "active"
              }`}
              onClick={() => handleTabChange("conversation")}
            >
              <FaComments size={35} className="mx-auto" />
              {/* <div>Chats</div> */}
            </div>
            <div
              className={`d-flex align-items-center custom-link ${
                activeTab === "people" && "active"
              }`}
              onClick={() => handleTabChange("people")}
            >
              <FaUserFriends size={35} className="mx-auto" />
              {/* <div>People</div> */}
            </div>
          </div>
        </Col>

        {/* Content (Part 2) */}
        <Col sm={12} md={3} className="content-col border-left">
          {activeTab === "newConversation" && (
            <div>
              <h4>New Conversation</h4>
              <NewConversation
                duoConversationInfoList={duoConversationInfoList}
              />
            </div>
          )}
          {activeTab === "people" && (
            <div>
              <h4>People</h4>
              <People
                duoConversationInfoList={duoConversationInfoList}
                returnConversations={returnConversations}
                setTempConversationId={setTempConversationId}
                setTempRecentMessageId={setTempRecentMessageId}
                setTempMessages={setTempMessages}
                setSignalRId={setSignalRId}
                setIsGroup={setIsGroup}
                setTempConversationName={setTempConversationName}
                setMyNickname={setMyNickname}
                setToggleConversation={setToggleConversation}
                fetchAllMessage={fetchAllMessage}
              />
            </div>
          )}
          {activeTab === "conversation" && (
            <div>
              <h4>Conversation</h4>
              <Conversations
                returnConversations={returnConversations}
                duoConversationInfoList={duoConversationInfoList}
                groupConversationInfoList={groupConversationInfoList}
                setTempConversationId={setTempConversationId}
                setTempRecentMessageId={setTempRecentMessageId}
                setTempMessages={setTempMessages}
                setSignalRId={setSignalRId}
                setIsGroup={setIsGroup}
                setTempConversationName={setTempConversationName}
                setMyNickname={setMyNickname}
                setToggleConversation={setToggleConversation}
                fetchAllMessage={fetchAllMessage}
              />
            </div>
          )}
        </Col>

        {/* Selected Conversation (Part 3) */}
        <Col sm={12} md={6} className="selected-col border-left">
          <div>
            <SelectedConversation
              connection={connection}
              tempMessages={tempMessages}
              signalRId={signalRId}
              isGroup={isGroup}
              tempConversationName={tempConversationName}
              toggleConversation={toggleConversation}
              fetchAllConversations={fetchAllConversations}
            />
          </div>
        </Col>

        {/* Settings Column (Part 4) */}
        {toggleConversation && (
          <Col sm={12} md={2} className="settings-col border-left">
            <div className="d-flex">
              <FaCog size={24} className="mx-3" />
              <h4>Settings</h4>
            </div>

            <div>
              <ConversationSettings
                tempConversationId={tempConversationId}
                tempConversationName={tempConversationName}
                myNickname={myNickname}
                isGroup={isGroup}
              />
            </div>
          </Col>
        )}
      </Row>
    </Container>
  );
}

export default Chat;
