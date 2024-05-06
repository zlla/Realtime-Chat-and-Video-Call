import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { FaPhone, FaPaperPlane } from "react-icons/fa";
import { TbPhotoUp } from "react-icons/tb";
import { MdOutlineAddReaction } from "react-icons/md";
import axios from "axios";

import "../../styles/ComponentStyles/SelectedConversation.css";
import { apiUrl } from "../../settings/support";
import VideoCall from "./VideoCall";

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

  const [uploadedImageFileNames, setUploadedImageFileNames] = useState([]);

  const [imageUrls, setImageUrls] = useState([]);

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

  const handleSendButton = () => {
    if (uploadedImageFileNames.length > 0) {
      uploadedImageFileNames.forEach((uploadImageFileName) => {
        sendMessage(uploadImageFileName, signalRId, isGroup, "image");
      });
      setUploadedImageFileNames([]);
    }

    if (message !== "") {
      sendMessage(message, signalRId, isGroup);
    }
    setMessage("");
  };

  useEffect(() => {
    const storedUsername = localStorage.getItem("username");
    setUsername(storedUsername);
  }, []);

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

        const img = new Image();
        img.src = blobUrl;

        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });

        const imgWidth = img.naturalWidth;
        const imgHeight = img.naturalHeight;

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
                imgWidth,
                imgHeight,
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
  }, [tempMessages]);

  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const uploadImages = async (files) => {
    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append("Images", files[i]);
      }

      setIsUploading(true);
      const response = await axios.post(
        `${apiUrl}/image/image-uploads`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setProgress(percentCompleted);
          },
        }
      );

      console.log("Upload successful:", response.data);
      return response.data;
    } catch (error) {
      console.error("Error uploading file:", error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const files = e.target.files;

    try {
      const data = await uploadImages(files);
      setUploadedImageFileNames(data);
    } catch (error) {
      console.log(error);
    }
  };

  const handlePaste = async (e) => {
    e.preventDefault();
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;

    for (const item of items) {
      if (item.kind === "file") {
        const blob = item.getAsFile();

        try {
          const data = await uploadImages([blob]);
          setUploadedImageFileNames(data);
        } catch (error) {
          console.error("Error handling paste:", error);
        }
      }
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    const imageFiles = [...files].filter((file) => file.type.match("image.*"));

    try {
      const data = await uploadImages(imageFiles);
      setUploadedImageFileNames(data);
    } catch (error) {
      console.error("Error handling files:", error);
    }
  };

  return (
    <div className="messenger-container">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h4>{tempConversationName}</h4>
        {toggleConversation && (
          <div className="button-container">
            <button className="btn btn-light mr-2 rounded-circle-btn">
              <FaPhone className="call-icon" />
            </button>
            <VideoCall connection={connection} signalRId={signalRId} />
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
                        let divStyle;
                        if (item.imgWidth > item.imgHeight) {
                          divStyle = {
                            width: 400,
                            height: 250,
                          };
                        } else {
                          divStyle = {
                            width: 250,
                            height: 350,
                          };
                        }

                        return (
                          <div key={item.messageId} style={divStyle}>
                            <img
                              src={item.imageUrl}
                              width={"100%"}
                              height={"100%"}
                              style={{
                                objectFit: "cover",
                              }}
                              alt="image"
                            />
                          </div>
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
        <div>
          <div
            className="input-container d-flex align-items-center"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            <div className="me-2 d-flex justify-content-around">
              <div>
                <label
                  htmlFor="file-upload"
                  className="btn btn-light rounded-5"
                >
                  <TbPhotoUp />
                </label>
                <input
                  id="file-upload"
                  type="file"
                  multiple
                  style={{ display: "none" }}
                  onChange={handleFileUpload}
                />
                <a className="btn btn-light rounded-5">
                  <MdOutlineAddReaction />
                </a>
              </div>
            </div>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyUp={(e) => {
                if (e.key === "Enter" && !e.repeat) {
                  e.preventDefault();
                  handleSendButton();
                }
              }}
              onPaste={(e) => handlePaste(e)}
              className="form-control mb-2"
              placeholder="Type your message"
            />
            <div>
              <button
                className="btn btn-primary ml-2"
                type="button"
                onClick={() => {
                  handleSendButton();
                }}
              >
                <FaPaperPlane className="send-icon" />{" "}
              </button>
            </div>
          </div>

          {/* Image uploads */}
          <div>
            <div>{isUploading && <div>{progress}%</div>}</div>

            {uploadedImageFileNames && uploadedImageFileNames.length > 0 && (
              <div>
                <button
                  className="btn btn-danger mb-2"
                  onClick={() => setUploadedImageFileNames([])}
                >
                  Remove All
                </button>
                <div>
                  {uploadedImageFileNames.map((uploadedImageFileName) => {
                    return (
                      <img
                        key={uploadedImageFileName}
                        src={`${apiUrl}/image/Uploads/${uploadedImageFileName}`}
                        alt=""
                        style={{
                          width: 100,
                          height: 100,
                          objectFit: "contain",
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            )}
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
