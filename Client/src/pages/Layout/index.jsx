import { useEffect, useRef } from "react";
import { Outlet } from "react-router-dom";
import "./styles/style.css";
import { any } from "prop-types";

const Layout = ({ stream, remoteStream }) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const videoContainerRef = useRef(null);
  const dragObject = useRef(null);

  useEffect(() => {
    if (stream && localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const handleMouseDown = (e) => {
    dragObject.current = {
      ref: videoContainerRef.current,
      offsetX: e.clientX - videoContainerRef.current.offsetLeft,
      offsetY: e.clientY - videoContainerRef.current.offsetTop,
    };
  };

  const handleMouseMove = (e) => {
    if (!dragObject.current) return;
    const { ref, offsetX, offsetY } = dragObject.current;

    // Calculate boundaries of the container
    const minX = 0;
    const minY = 0;
    const maxX = window.innerWidth - ref.offsetWidth;
    const maxY = window.innerHeight - ref.offsetHeight;

    // Calculate new position within boundaries
    let newX = e.clientX - offsetX;
    let newY = e.clientY - offsetY;
    newX = Math.max(minX, Math.min(newX, maxX));
    newY = Math.max(minY, Math.min(newY, maxY));

    ref.style.left = newX + "px";
    ref.style.top = newY + "px";
  };

  const handleMouseUp = () => {
    dragObject.current = null;
  };

  useEffect(() => {
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  return (
    <div className="layout-container">
      <div
        ref={videoContainerRef}
        className="video-container draggable-video"
        onMouseDown={handleMouseDown}
      >
        <div className="remote-video">
          {remoteStream && (
            <video width={320} height={240} autoPlay ref={remoteVideoRef} />
          )}
          <div className="local-video">
            {stream && (
              <video width={160} height={120} autoPlay ref={localVideoRef} />
            )}
          </div>
        </div>
      </div>
      <Outlet />
    </div>
  );
};

Layout.propTypes = {
  stream: any,
  remoteStream: any,
};

export default Layout;
