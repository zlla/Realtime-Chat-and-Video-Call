import axios from "axios";
import { useNavigate } from "react-router";
import { func } from "prop-types";
import * as signalR from "@microsoft/signalr";
import { useEffect, useState } from "react";

import { apiUrl } from "../../settings/support";

const Login = (props) => {
  const { setAuth } = props;
  const [username, setUsername] = useState("");
  const [connection, setConnection] = useState();
  const navigate = useNavigate();

  const saveConnectionId = async (SId) => {
    const config = {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
      },
    };

    const bodyParameters = {
      SId: SId,
    };

    try {
      axios.post(`${apiUrl}/chatHub/saveSignalRId`, bodyParameters, config);
    } catch (error) {
      console.log(error);
    }
  };

  const handleLogin = async () => {
    try {
      const response = await axios.post(`${apiUrl}/login`, {
        username: username,
        password: "12345",
      });
      setAuth(true);
      const { accessToken, refreshToken } = response.data;
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);

      if (connection) {
        connection
          .start()
          .then(() => {
            // Save the SignalR connection id
            saveConnectionId(connection.connectionId);
            navigate("/chat");
          })
          .catch((err) =>
            console.error("Error starting SignalR connection:", err)
          );
      }
    } catch (error) {
      setAuth(false);
      console.error(error);
    }
  };

  useEffect(() => {
    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${apiUrl}/chatHub`)
      .build();

    setConnection(newConnection);

    return () => {
      if (newConnection) {
        newConnection.stop().catch((err) => console.error(err.toString()));
      }
    };
  }, []);

  return (
    <div>
      <input
        type="text"
        value={username}
        onChange={(e) => {
          setUsername(e.target.value);
        }}
      />
      <button onClick={() => handleLogin()}>login</button>
    </div>
  );
};

Login.propTypes = {
  setAuth: func,
};

export default Login;
