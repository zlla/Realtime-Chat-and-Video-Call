import { FaVideo } from "react-icons/fa";
import { string } from "prop-types";
import { useCallback, useContext, useEffect } from "react";

import { configuration } from "../../../settings/stun-turn-server-config";
import { ChatContext } from "../../../App";

const VideoCall = ({ signalRId }) => {
  const {
    peerRef,
    duoCallSignal,
    setStream,
    setRemoteStream,
    duoCallState,
    setDuoCallState,
  } = useContext(ChatContext);

  const handleVideoCallBtnClick = async () => {
    duoCallSignal("CreateDuoCallConnection", signalRId, "");
  };

  const makeCall = useCallback(async () => {
    const pc = new RTCPeerConnection(configuration);
    peerRef.current = pc;

    peerRef.current.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    peerRef.current.onicecandidate = (event) => {
      if (event.candidate) {
        duoCallSignal("SendIceCandidate", signalRId, event.candidate);
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

    duoCallSignal("OfferDuoCall", signalRId, peerRef.current.localDescription);
  }, [duoCallSignal, peerRef, setRemoteStream, setStream, signalRId]);

  useEffect(() => {
    if (duoCallState === "remoteAccepted") {
      makeCall();
    } else if (duoCallState === "remoteRejected") {
      console.log("Your friend have rejected your request");
    }

    setDuoCallState("");
  }, [duoCallState, makeCall, setDuoCallState]);

  // const stopBothVideoAndAudio = useCallback((stream) => {
  //   stream.getTracks().forEach((track) => {
  //     if (track.readyState == "live") {
  //       track.stop();
  //     }
  //   });
  // }, []);

  return (
    <>
      <button
        className="btn btn-light rounded-circle-btn"
        onClick={handleVideoCallBtnClick}
      >
        <FaVideo className="call-icon" />
      </button>
    </>
  );
};

VideoCall.propTypes = {
  signalRId: string,
};

export default VideoCall;
