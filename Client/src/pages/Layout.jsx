import { useEffect } from "react";
import { Outlet } from "react-router-dom";

const Layout = ({ stream, remoteStream }) => {
  useEffect(() => {
    if (stream) {
      const videoElement = document.getElementById("localVideo");
      if (videoElement) {
        videoElement.srcObject = stream;
      }
    }
  }, [stream]);

  useEffect(() => {
    if (remoteStream) {
      const videoElement = document.getElementById("remoteVideo");
      if (videoElement) {
        videoElement.srcObject = remoteStream;
      }
    }
  }, [remoteStream]);

  return (
    <div>
      <div>Layout</div>
      <div className="d-flex">
        <div>
          {stream && (
            <video
              width={200}
              height={200}
              id="localVideo"
              autoPlay
              controls={false}
            />
          )}
        </div>
        <div>
          {remoteStream && (
            <video
              width={200}
              height={200}
              id="remoteVideo"
              autoPlay
              controls={false}
            />
          )}
        </div>
      </div>
      <Outlet />
    </div>
  );
};
export default Layout;
