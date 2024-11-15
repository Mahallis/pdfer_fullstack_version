import { useState } from "react";
import ProgressPopup from "./ProgressPopup/ProgressPopup";

export default function CompressForm() {
  const dpi = [
    { value: "100", label: "Низкое" },
    { value: "150", label: "Нормальное" },
  ];

  const [currentQuality, setCurrentQuality] = useState(30);
  const [modalState, setModalState] = useState({
    isTriggered: false,
    status: "",
    animation: "progress",
  }); // change this hook to modalState and combine it with action state
  const [isDragging, setIsDragging] = useState(false);

  const onSubmitForm = async (event) => {
    setModalState((prevState) => {
      return { ...prevState, status: "Обработка", isTriggered: true };
    });
    event.preventDefault();
    const formData = new FormData(event.target);

    try {
      const response = await fetch("http://localhost:8000/compress/", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Ошибка: ${response.status} ${response.statusText}`);
      }
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download =
        "zip" in blob.type.split("/")
          ? "compressed_file.pdf"
          : "compressed.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      setModalState((prevState) => {
        return { ...prevState, animation: "fail" };
      });
    } finally {
      setModalState((prevState) => {
        return {
          ...prevState,
          animation: prevState.animation !== "fail" ? "success" : "fail",
          status:
            prevState.animation !== "fail"
              ? "Окно будет закрыто через 3 секунды"
              : "Произошла ошибка",
        };
      });
      setTimeout(() => {
        setModalState(() => {
          return { status: "", animation: "progress", isTriggered: false };
        });
      }, 3000);
    }
  };

  return (
    <>
      <ProgressPopup modalState={modalState} setModalState={setModalState} />
      <div className="card col-xl-6 position-relative">
        <h3 className="text-center card-header">Сжатие pdf файлов</h3>
        <div className="card-body d-flex flex-column">
          <h6 className=" text-center card-title mb-3">
            Чем ниже разрешение и качество, тем меньше размер итогового файла
          </h6>
          <form
            className="container"
            onSubmit={onSubmitForm}
            onDragEnter={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              setIsDragging(false);
            }}
            onDragOver={(event) => event.preventDefault()}
          >
            <div className="row">
              <div className="col-3">
                <div className="form-check form-switch">
                  <input
                    id="grayscale"
                    role="switch"
                    className="form-check-input"
                    type="checkbox"
                    name="grayscale"
                  />
                  <label htmlFor="grayscale" className="form-check-label">
                    Серый цвет
                  </label>
                </div>
              </div>
              <div className="col-9">
                <div className="form-floating">
                  <select
                    id="floatingSelect"
                    className="form-select"
                    aria-label="dpi"
                    name="dpi"
                  >
                    {dpi.map((option) => {
                      return (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      );
                    })}
                  </select>
                  <label htmlFor="floatingSelect">Разрешение файла</label>
                </div>
              </div>
            </div>
            <div className="row">
              <div className="col">
                <label htmlFor="quality" className="form-label">
                  Качество
                  <span className="badge text-bg-primary mx-2">
                    {currentQuality}
                  </span>
                </label>
                <input
                  type="range"
                  className="form-range"
                  min="0"
                  max="70"
                  step="10"
                  id="quality"
                  name="quality"
                  value={currentQuality}
                  onChange={(event) => {
                    setCurrentQuality(event.target.value);
                  }}
                />
              </div>
            </div>
            <div className="row">
              <div className="col floating-group input-group-lg">
                <label htmlFor="formFileMultiple" className="form-label">
                  Загрузите один или несколько pdf файлов
                </label>
                <input
                  className="form-control"
                  type="file"
                  id="formFileMultiple"
                  name="files"
                  multiple
                  style={{ border: isDragging && "4px solid red" }}
                  required
                />
              </div>
            </div>
            <div className="row mt-5">
              <button className="btn btn-primary" type="submit">
                Сжать документы
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
