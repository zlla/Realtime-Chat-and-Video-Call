import axios from "axios";
import { useNavigate } from "react-router";
import { func } from "prop-types";

import { apiUrl } from "../../settings/support";

const Login = (props) => {
  const { setAuth } = props;
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
};

export default Login;
