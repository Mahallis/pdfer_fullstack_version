import { useCallback, useState, useRef } from "react";

import ProgressPopup from "./ProgressPopup/ProgressPopup";
import usePolling from "../hooks/usePolling"
import { createChunks } from "../utils/uploadFile";
import { downloadFile } from "../utils/downloadFile";

export default function CompressForm() {
  const compression = [
    { value: "69", label: "Экстремальное сжатие", selected: false },
    { value: "100", label: "Нормальное сжатие", selected: true },
    { value: "150", label: "Максимальное качество", selected: false },
  ];

  const [uploadState, setUploadState] = useState({
    taskID: '',
    intervalID: '',
    files_folder: '',
    filenames: [],
  });

  const [modalState, setModalState] = useState({
    isTriggered: false,
    status: "",
    animation: "progress",
  });

  const [progressState, setProgressState] = useState({
    progressValue: 0,
    isProgress: false,
  })
  const fileInputValueRef = useRef(null)

  const onChangeHandler = (event) => {
    setProgressState((prevState) => ({
      ...prevState,
      isProgress: true
    }))
    createChunks(event, setUploadState, setProgressState, uploadState)
  }

  const onSubmitForm = async (event) => {
    // Form submit hanler fuction

    event.preventDefault();
    const formData = new FormData(event.target);

    setUploadState((prevState) => ({
      ...prevState,
      filenames: formData.getAll("files")
    }));

    formData.delete('files')
    formData.append('foldername', uploadState.files_folder)

    setModalState({
      isTriggered: true,
      status: "Обработка",
      animation: "progress",
    });

    try {
      const response = await fetch("/api/compress/", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Ошибка сервера: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      setUploadState((prevState) => ({
        ...prevState,
        taskID: result.task_id,
      }));

    } catch (error) {
      console.error("Ошибка при отправке формы:", error);
      setModalState({
        isTriggered: true,
        animation: "fail",
        status: "Произошла ошибка при отправке формы",
      });
    }
  };

  const onSuccess = useCallback((filename, file, mime_type) => {
    downloadFile(file, filename, mime_type, fileInputValueRef);
    setModalState({
      isTriggered: true,
      animation: "success",
      status: "Окно будет закрыто через 5 секунды",
    });

    setTimeout(() => {
      setModalState({
        isTriggered: false,
        animation: "",
        status: "",
      });
    }, 5000);
  }, [setModalState])

  const onFailure = useCallback(() => {
    setModalState({
      isTriggered: true,
      animation: "fail",
      status: "Произошла ошибка при обработке",
    });
  }, [setModalState])

  const onPending = useCallback(() => {
    setModalState({
      isTriggered: true,
      animation: "progress",
      status: "Обработка",
    });
  }, [setModalState])

  usePolling(
    uploadState.taskID,
    modalState.isTriggered,
    onSuccess,
    onFailure,
    onPending
  );

  return (
    <>
      <ProgressPopup props={{ modalState, setModalState, uploadState, fileInputValueRef }}/>
      <div className="card col-xl-6 position-relative">
        <h3 className="text-center card-header">Уменьшение размера PDF файлов</h3>
        <div className="card-body d-flex flex-column">
          <h6 className="text-center card-title mb-3">
            Чем выше степень сжатия, тем меньше размер итогового файла
          </h6>
          <form className="container" onSubmit={onSubmitForm}>
            <div className="row">
              <div className="col">
                <div className="form-floating">
                  <select
                    id="floatingSelect"
                    className="form-select"
                    aria-label="compression"
                    name="compression"
                  >
                    {compression.map((option) => (
                      <option key={option.value} value={option.value} defaultValue={option.selected}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <label htmlFor="floatingSelect">Степень сжатия</label>
                </div>
              </div>
            </div>
              <div className="floating-group input-group-lg">
                <label htmlFor="formFileMultiple" className="form-label">
                  Загрузите один или несколько PDF файлов
                </label>
                <input
                  className="form-control"
                  id="file"
                  name="files"
                  type="file"
                  ref={fileInputValueRef.current}
                  multiple
                  onChange={onChangeHandler}
                  required
                />
              </div>
              <div className="progress mt-3" role="progressbar" aria-valuenow={progressState.progressValue} aria-valuemin="0" aria-valuemax="100" 
                style={{height: "40px", opacity: progressState.isProgress ? '100' : '0'}}>
                <div className="progress-bar progress-bar-striped progress-bar-animated" style={{width: `${progressState.progressValue}%`}}></div>
              </div>
            <div className="row mt-4">
              <button className="btn btn-primary" type="submit" disabled={progressState.isProgress}>
                { progressState.isProgress ? 'Загрузка файлов' : 'Сжать документы' }
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}