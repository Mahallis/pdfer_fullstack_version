import { useEffect, useState } from "react";
import success from "./success.svg";
import fail from "./fail.svg";

export default function ProgressPopup({ props }) {
  const { modalState, setModalState, uploadState, fileInputValueRef } = props
  const [dots, setDots] = useState(".");

  useEffect(() => {
    if (modalState.animation === "progress" && modalState.isTriggered) {
      const interval = setInterval(() => {
        setDots((prevDots) => (prevDots.length < 3 ? prevDots + "." : "."));
      }, 1000);
      return () => {
        clearInterval(interval);
      }
    }
  }, [modalState.animation, modalState.isTriggered]);

  let sendAbort = () => {
    const response = fetch(
      `/api/cancel_task/${uploadState.taskID}`, {
        method: 'POST',
        body: uploadState.files_folder
      }
    )
    if (response.ok) {
      fileInputValueRef.current.value = null
    }
  }

  let progress = (
    <div className="spinner-border text-primary" role="status">
      <span className="visually-hidden">Loading...</span>
    </div>
  );

  return (
    <>
      <div
        className="modal"
        tabIndex="-1"
        style={{ display: modalState.isTriggered ? "block" : "none" }}
      >
        <div className="modal-dialog modal-dialog-centered ">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Выполнение запроса</h5>
              <button
                type="button"
                className="btn-close"
                aria-label="Close"
                onClick={() => {
                  setModalState((prevState) => !prevState.isTriggered);
                  if (modalState.animation !== "success") {
                    sendAbort()
                  }
                }}
              ></button>
            </div>
            <div className="modal-body text-center">
              {modalState.animation === "progress" ? (
                progress
              ) : (
                <img
                  src={modalState.animation === "success" ? success : fail}
                  alt={modalState.animation}
                />
              )}
              <p className="mt-3">
                {modalState.status}
                {modalState.animation === "progress" ? dots : ""}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
