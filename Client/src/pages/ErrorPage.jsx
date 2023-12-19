import { useNavigate } from "react-router";

const ErrorPage = () => {
  const navigate = useNavigate();
  return (
    <div>
      <h1>404 Not Found!</h1>
      <button onClick={() => navigate("/")}>Back To Home</button>
    </div>
  );
};
export default ErrorPage;
