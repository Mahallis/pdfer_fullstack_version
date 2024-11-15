import { useEffect, useState } from "react";
import success from "./success.svg";
import fail from "./fail.svg";

export default function ProgressPopup({ modalState, setModalState }) {
  const [dots, setDots] = useState(".");
  useEffect(() => {
    if (modalState.animation === "progress" && modalState.isTriggered) {
      const interval = setInterval(() => {
        setDots((prevDots) => (prevDots.length < 3 ? prevDots + "." : "."));
        console.log("done");
      }, 1000);
      return () => clearInterval(interval); // Очищаем интервал при размонтировании
    }
  }, [modalState.animation, modalState.isTriggered]);
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
