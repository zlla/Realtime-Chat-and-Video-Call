import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { FaPhone, FaVideo, FaPaperPlane } from "react-icons/fa";
import { TbPhotoUp } from "react-icons/tb";
import { MdOutlineAddReaction } from "react-icons/md";

import "../../styles/ComponentStyles/SelectedConversation.css";
import axios from "axios";
import { apiUrl } from "../../settings/support";

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

  const sendMessage = (message, id, isGroup, messageType = "text") => {
    if (!connection) return;

    if (isGroup) {
      connection
        .invoke("SendMessageToGroup", id, message, messageType)
        .catch((err) => console.error(err.toString()));

      return;
    }

    const method = id === "All" ? "SendMessageToAll" : "SendMessageToUser";

    connection
      .invoke(method, id, message, messageType)
      .then(() => {
        fetchAllConversations();
      })
      .catch((err) => console.error(err.toString()));
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];

    const formData = new FormData();
    formData.append("MyImage", file);

    try {
      const response = await axios.post(`${apiUrl}/image`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      console.log("Upload successful:", response.data);

      sendMessage(response.data, signalRId, isGroup, "image");
    } catch (error) {
      console.error("Error uploading file:", error);
    }
  };

  useEffect(() => {
    const storedUsername = localStorage.getItem("username");
    setUsername(storedUsername);
  }, []);

  const [imageUrls, setImageUrls] = useState([]);

  useEffect(() => {
    const fetchImage = async (imageUrlResponse, messageId) => {
      try {
        const response = await axios.get(
          `${apiUrl}/image/${imageUrlResponse}`,
          {
            responseType: "blob",
          }
        );
        const blobUrl = URL.createObjectURL(response.data);

        setImageUrls((prevState) => {
          const isMessageIdExist = prevState.some(
            (item) => item.messageId.toString() === messageId.toString()
          );

          if (!isMessageIdExist) {
            return [
              ...prevState,
              {
                messageId,
                imageUrl: blobUrl,
              },
            ];
          }

          return prevState;
        });
      } catch (error) {
        console.error("Error fetching image:", error);
        throw error; // Rethrow the error so that it can be handled where fetchImage is called.
      }
    };

    if (messagesEndRef.current) {
      messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
    }

    tempMessages.forEach((msg) => {
      if (msg.messageType === "image") {
        fetchImage(msg.content, msg.id);
      }
    });
  }, [tempMessages, setImageUrls]);

  useEffect(() => {
    console.log(imageUrls);
  }, [imageUrls]);

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
            }
            if (message.messageType === "image") {
              return (
                <div
                  key={message.id}
                  className={`message-container d-flex ${
                    message.senderName === username
                      ? "justify-content-end"
                      : "justify-content-start"
                  }`}
                >
                  <div>
                    {imageUrls.map((item) => {
                      if (item.messageId.toString() === message.id.toString()) {
                        return (
                          <img
                            key={item.messageId}
                            src={item.imageUrl}
                            alt="image"
                            style={{ width: "100px", height: "100px" }}
                            className="m-1"
                          />
                        );
                      }
                    })}
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
        <div
          className="input-container d-flex align-items-center"
          style={{ width: "80%" }}
        >
          <div className="me-2 d-flex justify-content-around">
            <div>
              <label htmlFor="file-upload" className="btn btn-light rounded-5">
                <TbPhotoUp />
              </label>
              <input
                id="file-upload"
                type="file"
                style={{ display: "none" }}
                onChange={handleFileUpload}
              />
            </div>
            <a className="btn btn-light rounded-5">
              <MdOutlineAddReaction />
            </a>
          </div>
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
          <div>
            <button
              className="btn btn-primary ml-2"
              type="button"
              onClick={() => {
                sendMessage(message, signalRId, isGroup);
                setMessage("");
              }}
            >
              <FaPaperPlane className="send-icon" />{" "}
            </button>
          </div>
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
