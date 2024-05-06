import { useState, useEffect, useRef, useCallback } from "react";
import { FaVideo } from "react-icons/fa";
import { any, string } from "prop-types";

const configuration = {
  iceServers: [
    {
      urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
    },
  ],
  iceCandidatePoolSize: 10,
};

const VideoCall = ({ connection, signalRId }) => {
  const [stream, setStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const peerRef = useRef(null);

  async function getConnectedDevices(type) {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter((device) => device.kind === type);
    } catch (error) {
      console.error("Error enumerating devices:", error);
      return [];
    }
  }

  async function openCamera(cameraId, minWidth, minHeight) {
    const constraints = {
      audio: { echoCancellation: false },
      video: {
        deviceId: cameraId,
        width: { min: minWidth },
        height: { min: minHeight },
      },
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      return stream;
    } catch (error) {
      console.error("Error accessing camera:", error);
      throw error;
    }
  }

  const sendMessage = useCallback(
    async (method, id, paramString) => {
      if (!connection) return;

      try {
        await connection.invoke(method, id, JSON.stringify(paramString));
      } catch (error) {
        console.error(error.toString());
      }
    },
    [connection]
  );

  async function makeCall() {
    const pc = new RTCPeerConnection(configuration);
    peerRef.current = pc;

    peerRef.current.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    peerRef.current.onicecandidate = (event) => {
      if (event.candidate) {
        sendMessage("SendIceCandidate", signalRId, event.candidate);
      }
    };

    const localStream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: true,
    });

    localStream.getTracks().forEach((track) => {
      peerRef.current.addTrack(track, localStream);
    });

    setStream(localStream);
    const offer = await peerRef.current.createOffer();
    await peerRef.current.setLocalDescription(offer);

    sendMessage("MakeDuoCall", signalRId, peerRef.current.localDescription);
  }

  const handleVideoCallBtnClick = async () => {
    try {
      const cameras = await getConnectedDevices("videoinput");
      if (cameras && cameras.length > 0) {
        const cameraStream = await openCamera(cameras[0].deviceId, 1280, 720);
        setStream(cameraStream);
      }
    } catch (error) {
      console.error("Error initiating video call:", error);
    }
    makeCall();
  };

  useEffect(() => {
    if (connection) {
      connection.on("DuoCallRequest", async (offer, requestId) => {
        if (!peerRef.current) {
          peerRef.current = new RTCPeerConnection(configuration);
        }

        peerRef.current.ontrack = (event) => {
          setRemoteStream(event.streams[0]);
        };

        peerRef.current.onicecandidate = (event) => {
          if (event.candidate) {
            sendMessage("SendIceCandidate", signalRId, event.candidate);
          }
        };

        const localStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: true,
        });

        localStream.getTracks().forEach((track) => {
          peerRef.current.addTrack(track, localStream);
        });

        setStream(localStream);

        const offerObject = JSON.parse(offer);
        peerRef.current.setRemoteDescription(
          new RTCSessionDescription(offerObject)
        );
        const answer = await peerRef.current.createAnswer();
        await peerRef.current.setLocalDescription(answer);
        sendMessage(
          "AnswerDuoCall",
          requestId,
          peerRef.current.localDescription
        );
      });

      connection.on("DuoCallAnswer", async (answer) => {
        if (peerRef.current) {
          const answerObject = JSON.parse(answer);
          const remoteDesc = new RTCSessionDescription(answerObject);
          await peerRef.current.setRemoteDescription(remoteDesc);
        }
      });

      connection.on("NewIceCandidate", async (candidate) => {
        try {
          await peerRef.current.addIceCandidate(JSON.parse(candidate));
        } catch (error) {
          console.error("Error adding ICE candidate:", error);
        }
      });
    }
  }, [connection, sendMessage, stream]);

  useEffect(() => {
    if (stream) {
      const videoElement = document.getElementById("localVideo");
      if (videoElement) {
        videoElement.srcObject = stream;
      }
    }
  }, [stream]);

  useEffect(() => {
    if (remoteStream) {
      const videoElement = document.getElementById("remoteVideo");
      if (videoElement) {
        videoElement.srcObject = remoteStream;
      }
    }
  }, [remoteStream]);
  return (
    <>
      <button
        className="btn btn-light rounded-circle-btn"
        onClick={handleVideoCallBtnClick}
      >
        <FaVideo className="call-icon" />
      </button>
      <div className="d-flex">
        <div>
          {stream && (
            <video
              width={200}
              height={200}
              id="localVideo"
              autoPlay
              controls={false}
            />
          )}
        </div>
        <div>
          {remoteStream && (
            <video
              width={200}
              height={200}
              id="remoteVideo"
              autoPlay
              controls={false}
            />
          )}
        </div>
      </div>
    </>
  );
};

VideoCall.propTypes = {
  connection: any,
  signalRId: string,
};

export default VideoCall;
