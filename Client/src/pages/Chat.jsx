import axios from "axios";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import * as signalR from "@microsoft/signalr";
import "bootstrap/dist/css/bootstrap.min.css";
import { Button, Container, Row, Col, Nav } from "react-bootstrap";
import { FaUserFriends, FaComments, FaPlus, FaCog } from "react-icons/fa"; // Import icons as needed

import { apiUrl } from "../settings/support";
import NewConversation from "../components/chat/NewConversation";
import Conversations from "../components/chat/Conversations";
import SelectedConversation from "../components/chat/SelectedConversation";
import People from "../components/chat/People";

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

  return (
    <Container fluid>
      <Row>
        {/* Left Navbar (Part 1) */}
        <Col md={1} className="navbar-col text-center">
          <Nav
            variant="pills"
            className="flex-column"
            defaultActiveKey="conversation"
            onSelect={handleTabChange}
          >
            <Nav.Item>
              <Nav.Link eventKey="newConversation">
                <FaPlus size={24} />
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="conversation">
                  <FaComments size={24} />
                </Nav.Link>
              </Nav.Item>
              <Nav.Link eventKey="people">
                <FaUserFriends size={24} />
              </Nav.Link>
            </Nav.Item>
          </Nav>
        </Col>

        {/* Content (Part 2) */}
        <Col md={2} className="content-col">
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
                setToggleConversation={setToggleConversation}
                setSignalRId={setSignalRId}
                setIsGroup={setIsGroup}
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
                setToggleConversation={setToggleConversation}
                fetchAllMessage={fetchAllMessage}
              />
            </div>
          )}
        </Col>

        {/* Selected Conversation (Part 3) */}
        <Col md={6} className="selected-col">
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
        <Col md={3} className="settings-col">
          <div>
            <h4>Settings</h4>
            {/* Add your settings content here */}
            <FaCog size={24} />
          </div>
        </Col>
      </Row>

      <Button
        style={{ marginTop: "20px" }}
        variant="primary"
        onClick={() => {
          navigate("/");
        }}
      >
        Home
      </Button>
    </Container>
  );
}

export default Chat;
