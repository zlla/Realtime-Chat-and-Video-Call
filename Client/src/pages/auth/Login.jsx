import axios from "axios";
import { useNavigate } from "react-router";
import { func } from "prop-types";
import { useState } from "react";

import { apiUrl } from "../../settings/support";

const Login = (props) => {
  const { setAuth } = props;
  const navigate = useNavigate("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLoginForm = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post(`${apiUrl}/login`, {
        username,
        password,
      });
      setAuth(true);
      const { accessToken, refreshToken } = response.data;
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      localStorage.setItem("username", username);
      navigate("/chat");
    } catch (error) {
      setAuth(false);
      console.error(error);
    }
  };

  return (
    <div>
      <form>
        <label htmlFor="username">Username</label>
        <input
          type="text"
          name="username"
          id="username"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
          }}
        />
        <br />

        <label htmlFor="password">Password</label>
        <input
          type="password"
          name="password"
          id="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
          }}
        />
        <br />

        <button onClick={(e) => handleLoginForm(e)}>Submit</button>
      </form>
      <button onClick={() => navigate("/register")}>Move to Register</button>
    </div>
  );
};

Login.propTypes = {
  setAuth: func,
};

export default Login;
