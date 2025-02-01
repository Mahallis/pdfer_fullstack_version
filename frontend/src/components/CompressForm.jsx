import { useState } from "react";
import ProgressPopup from "./ProgressPopup/ProgressPopup";

export default function CompressForm() {
  const compression = [
    { value: "150", label: "Минимальное сжатие", selected: false },
    { value: "100", label: "Нормальное сжатие", selected: true },
    { value: "69", label: "Экстремальное сжатие", selected: false },
  ];

  const [modalState, setModalState] = useState({
    isTriggered: false,
    status: "",
    animation: "progress",
  });
  const [isDragging, setIsDragging] = useState(false);

  const onSubmitForm = async (event) => {
    setModalState((prevState) => {
      return { ...prevState, status: "Обработка", isTriggered: true };
    });
    event.preventDefault();
    const formData = new FormData(event.target);

    // TODO: change behavior to fetch task id, and then check for results 
    try {
      const response = await fetch("/api/compress/", {
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
      let files_info = formData.getAll("files");
      a.download = blob.type.split("/").includes("zip")
        ? `${files_info.length}_files_compressed.zip`
        : `${files_info[0].name.slice(0, -4)}_compressed.pdf`;
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
        <h3 className="text-center card-header">Уменьшение размера pdf файлов</h3>
        <div className="card-body d-flex flex-column">
          <h6 className=" text-center card-title mb-3">
            Чем выше степень сжатия, тем меньше размер итогового файла
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
              <div className="col">
                <div className="form-floating">
                  <select
                    id="floatingSelect"
                    className="form-select"
                    aria-label="compression"
                    name="compression"
                  >
                    {compression.map((option) => {
                      return (
                        <option key={option.value} value={option.value} selected={option.selected}> 
                          {option.label}
                        </option>
                      );
                    })}
                  </select>
                  <label htmlFor="floatingSelect">Степень сжатия</label>
                </div>
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
