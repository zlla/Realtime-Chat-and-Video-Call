import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { createContext, useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import * as signalR from "@microsoft/signalr";

import { apiUrl } from "./settings/support";
import { configuration } from "./settings/stun-turn-server-config";
import Chat from "./pages/Chat";
import Login from "./pages/auth/Login";
import Layout from "./pages/Layout";
import Home from "./pages/Home";
import Register from "./pages/auth/Register";
import ErrorPage from "./pages/ErrorPage";

export const ChatContext = createContext(null);

function App() {
  const initialToken = localStorage.getItem("accessToken");
  const [token, setToken] = useState(initialToken);
  const [auth, setAuth] = useState(!!initialToken);

  const [connection, setConnection] = useState(null);
  const peerRef = useRef(null);

  const [stream, setStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  const fetchNewToken = async () => {
    const accessToken = localStorage.getItem("accessToken");
    const refreshToken = localStorage.getItem("refreshToken");

    try {
      const axiosInstance = axios.create({
        baseURL: apiUrl,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          refreshToken,
        },
      });
      const response = await axiosInstance.post(`${apiUrl}/auth/refreshToken`);
      let newAccessToken = response.data.accessToken;

      setToken(newAccessToken);
      localStorage.setItem("accessToken", newAccessToken);
      localStorage.setItem("refreshToken", response.data.refreshToken);
    } catch (error) {
      setToken(null);
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      console.error(error);
    }
  };

  const duoCallSignal = useCallback(
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

  const handleCallRequest = useCallback(
    async (offer, requestId) => {
      if (!peerRef.current) {
        peerRef.current = new RTCPeerConnection(configuration);
      }

      peerRef.current.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
      };

      peerRef.current.onicecandidate = (event) => {
        if (event.candidate) {
          duoCallSignal("SendIceCandidate", requestId, event.candidate);
        }
      };

      const localStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: true,
      });

      localStream.getTracks().forEach((track) => {
        peerRef.current.addTrack(track, localStream);
      });

      const offerObject = JSON.parse(offer);
      peerRef.current.setRemoteDescription(
        new RTCSessionDescription(offerObject)
      );
      const answer = await peerRef.current.createAnswer();
      await peerRef.current.setLocalDescription(answer);

      duoCallSignal(
        "AnswerDuoCall",
        requestId,
        peerRef.current.localDescription
      );

      setStream(localStream);
    },
    [duoCallSignal]
  );

  const handleCallAnswer = useCallback(async (answer) => {
    if (peerRef.current) {
      const answerObject = JSON.parse(answer);
      const remoteDesc = new RTCSessionDescription(answerObject);
      await peerRef.current.setRemoteDescription(remoteDesc);
    }
  }, []);

  const handleNewIceCandidate = useCallback(async (candidate) => {
    try {
      await peerRef.current.addIceCandidate(JSON.parse(candidate));
    } catch (error) {
      console.error("Error adding ICE candidate:", error);
    }
  }, []);

  useEffect(() => {
    fetchNewToken();

    const intervalId = setInterval(fetchNewToken, 30000);

    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${apiUrl}/chatHub`)
      .build();

    setConnection(newConnection);

    return () => {
      clearInterval(intervalId);

      // Cleanup: Stop the connection when the component is unmounted
      if (newConnection) {
        newConnection.stop().catch((err) => console.error(err.toString()));
      }
    };
  }, []);

  useEffect(() => {
    const validateToken = async () => {
      try {
        await axios.post(`${apiUrl}/auth/validateToken`, {
          AccessToken: token,
        });
        setAuth(true);
      } catch (error) {
        setAuth(false);
        console.log("Error during validation:", error);
      }
    };

    if (token) {
      validateToken();
    }
  }, [token]);

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
      connection
        .start()
        .then(() => {
          saveSignalRId(connection.connectionId);
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
    if (connection) {
      connection.on(
        "DuoCallRequest",
        async (offer, requestId) => await handleCallRequest(offer, requestId)
      );

      connection.on("DuoCallAnswer", async (answer) => {
        await handleCallAnswer(answer);
      });

      connection.on("NewIceCandidate", async (candidate) => {
        await handleNewIceCandidate(candidate);
      });
    }
  }, [
    connection,
    peerRef,
    stream,
    duoCallSignal,
    handleCallRequest,
    handleCallAnswer,
    handleNewIceCandidate,
  ]);

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout stream={stream} remoteStream={remoteStream} />}>
          <Route path="*" element={<ErrorPage />} />
          <Route path="/" element={<Home auth={auth} setAuth={setAuth} />} />
          <Route path="register" element={<Register />} />
          <Route path="login" element={<Login setAuth={setAuth} />} />
          <Route
            path="chat"
            element={
              auth ? (
                <ChatContext.Provider
                  value={{
                    connection,
                    peerRef,
                    duoCallSignal,
                    setStream,
                    setRemoteStream,
                  }}
                >
                  <Chat auth={auth} />
                </ChatContext.Provider>
              ) : (
                <Navigate to="/login" />
              )
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
