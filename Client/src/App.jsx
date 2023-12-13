import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Chat from "./pages/Chat";
import { useState } from "react";
import Login from "./pages/auth/Login";
import ShareLayout from "./pages/ShareLayout";
import Home from "./pages/Home";

function App() {
  const [auth, setAuth] = useState(false);
  const [connection, setConnection] = useState(null);

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<ShareLayout />}>
          <Route path="/" element={<Home auth={auth} setAuth={setAuth} />} />
          <Route
            path="login"
            element={<Login setAuth={setAuth} setConnection={setConnection} />}
          />
          <Route
            path="chat"
            element={
              auth ? (
                <Chat auth={auth} connection={connection} />
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
