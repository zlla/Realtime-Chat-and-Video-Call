import axios from "axios";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import * as signalR from "@microsoft/signalr";

import { apiUrl } from "../../settings/support";

const Register = () => {
  const navigate = useNavigate();
  const [connection, setConnection] = useState(null);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const saveConnectionId = async (SId, accessToken) => {
    const config = {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    };

    const bodyParameters = {
      SId,
      username,
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

  const handleRegisterForm = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post(`${apiUrl}/register`, {
        email,
        username,
        password,
      });

      if (connection) {
        connection
          .start()
          .then(() => {
            // Save the SignalR connection id
            saveConnectionId(
              connection.connectionId,
              response.data.accessToken
            );
            navigate("/login");
          })
          .catch((err) =>
            console.error("Error starting SignalR connection:", err)
          );
      }
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
      if (newConnection) {
        newConnection.stop().catch((err) => console.error(err.toString()));
      }
    };
  }, []);

  return (
    <div>
      <form>
        <label htmlFor="email">Email</label>
        <input
          type="email"
          name="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <br />
        <label htmlFor="username">Username</label>
        <input
          type="text"
          name="username"
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <br />

        <label htmlFor="password">Password</label>
        <input
          type="password"
          name="password"
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <br />

        <button onClick={(e) => handleRegisterForm(e)}>Submit</button>
      </form>
      <button onClick={() => navigate("/login")}>Move to Login</button>
    </div>
  );
};
export default Register;
