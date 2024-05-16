import { useCallback, useEffect, useRef } from "react";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { Toast } from "primereact/toast";

import { Outlet } from "react-router-dom";
import "./styles/style.css";
import { any, bool } from "prop-types";

const Layout = ({
  stream,
  remoteStream,
  incomeCall,
  setIncomeCall,
  setDuoCallState,
}) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const videoContainerRef = useRef(null);
  const dragObject = useRef(null);
  const toast = useRef(null);

  const accept = useCallback(() => {
    toast.current.show({
      severity: "info",
      summary: "Confirmed",
      detail: "You have accepted",
      life: 3000,
    });
    setDuoCallState("accepted");
  }, [setDuoCallState]);

  const reject = useCallback(() => {
    toast.current.show({
      severity: "warn",
      summary: "Rejected",
      detail: "You have rejected",
      life: 3000,
    });
    setDuoCallState("rejected");
  }, [setDuoCallState]);

  const confirm = useCallback(
    (position) => {
      confirmDialog({
        message: "You have a video call",
        header: "Calling ...",
        icon: "pi pi-info-circle",
        position,
        accept,
        reject,
      });
    },
    [accept, reject]
  );

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
    if (stream && localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(() => {
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  useEffect(() => {
    if (incomeCall) {
      confirm("top-right");
      setIncomeCall(false);
    }
  }, [confirm, incomeCall, setIncomeCall]);

  return (
    <div className="layout-container">
      <Toast ref={toast} />
      <ConfirmDialog />

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
  incomeCall: bool,
  setIncomeCall: any,
  setDuoCallState: any,
};

export default Layout;
