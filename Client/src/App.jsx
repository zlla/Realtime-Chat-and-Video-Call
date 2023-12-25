import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";

import Chat from "./pages/Chat";
import Login from "./pages/auth/Login";
import ShareLayout from "./pages/ShareLayout";
import Home from "./pages/Home";
import Register from "./pages/auth/Register";
import { apiUrl } from "./settings/support";
import ErrorPage from "./pages/ErrorPage";

function App() {
  const initialToken = localStorage.getItem("accessToken");
  const [token, setToken] = useState(initialToken);
  const [auth, setAuth] = useState(!!initialToken);

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

  useEffect(() => {
    fetchNewToken();

    const intervalId = setInterval(fetchNewToken, 30000);
    return () => {
      clearInterval(intervalId);
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

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<ShareLayout />}>
          <Route path="/" element={<Home auth={auth} setAuth={setAuth} />} />
          <Route path="*" element={<ErrorPage />} />
          <Route path="register" element={<Register />} />
          <Route path="login" element={<Login setAuth={setAuth} />} />
          <Route
            path="chat"
            element={auth ? <Chat auth={auth} /> : <Navigate to="/login" />}
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
