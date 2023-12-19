import { bool, func } from "prop-types";
import { useNavigate } from "react-router";

const Home = (props) => {
  const { auth, setAuth } = props;
  const navigate = useNavigate();

  return (
    <div>
      <div>Home</div>
      {auth && (
        <button
          onClick={() => {
            setAuth(false);
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
          }}
        >
          Logout
        </button>
      )}
      {!auth && (
        <button
          onClick={() => {
            navigate("/login");
          }}
        >
          Login
        </button>
      )}
      <button
        onClick={() => {
          navigate("/chat");
        }}
      >
        Chat
      </button>
    </div>
  );
};

Home.propTypes = {
  auth: bool,
  setAuth: func,
};

export default Home;
