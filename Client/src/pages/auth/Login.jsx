import axios from "axios";
import { useNavigate } from "react-router";
import { any, func } from "prop-types";
import * as signalR from "@microsoft/signalr";

import { apiUrl } from "../../settings/support";

const Login = (props) => {
  const { setAuth, setConnection } = props;
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const response = await axios.post(`${apiUrl}/login`, {
        username: "test002",
        password: "12345",
      });
      setAuth(true);
      const { accessToken, refreshToken } = response.data;
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);

      const newConnection = new signalR.HubConnectionBuilder()
        .withUrl("http://localhost:5145/chathub")
        .build();

      setConnection(newConnection);
      navigate("/chat");
    } catch (error) {
      setAuth(false);
      console.error(error);
    }
  };

  return (
    <div>
      <button onClick={() => handleLogin()}>login</button>
    </div>
  );
};

Login.propTypes = {
  setAuth: func,
  setConnection: any,
};

export default Login;
