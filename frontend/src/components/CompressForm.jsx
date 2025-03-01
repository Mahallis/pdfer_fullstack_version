import { useCallback, useState, useRef } from "react";
import ProgressPopup from "./ProgressPopup/ProgressPopup";
import usePolling from "../hooks/usePolling"

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

  const [isDragging, setIsDragging] = useState(false);
  const [progressState, setProgressState] = useState({
    progressValue: 0,
    isProgress: false,
  })
  const fileInputValueRef = useRef(null)

  const generateFolderName = () => {
    const uuid = crypto.randomUUID()
    const timestamp = Date.now()
    return `${uuid}_${timestamp}`
  }

  const createChunks = async (event) => {
    const chunkSize = 1024 * 1024
    const files = Array.from(event.target.files)
    const totalChunks = files.reduce((acc, curr) => acc + Math.ceil(curr.size / (1024 ** 2)), 0)
    const step = Math.round((100 / totalChunks) * 1000) / 1000
    const foldername = generateFolderName()

    setUploadState((prevState) => ({
      ...prevState,
      files_folder: foldername,
    }))

    for (const file of files) {
      if (file.type === "application/pdf") {
        let fileChunks = Math.ceil(file.size / chunkSize)
        for (let i = 0; i < fileChunks; i++) {
          const start = i * chunkSize;
          const end = Math.min((i + 1) * chunkSize, file.size);
          const chunk = file.slice(start, end);
          await uploadChunk(chunk, i, fileChunks, file.name, foldername)
          setProgressState((prevState) => ({
            ...prevState,
            progressValue: prevState.progressValue < 100 
              ? Math.round((prevState.progressValue + step) * 100) / 100 
              : 100
          }))
        }
      } else {
        alert('Вы загрузили не pdf документ.')
      }
    }
    setProgressState(() => ({
      progressValue: 0,
      isProgress: false
    }))
  }

  const uploadChunk = async (chunk, index, total_chunks, filename, foldername) => {
    const formData = new FormData();
    formData.append('chunk', chunk)
    formData.append('chunk_index', index)
    formData.append('total_chunks', total_chunks)
    formData.append('filename', filename)
    formData.append('foldername', foldername)


    try {
      const response = await fetch("/api/upload-chunk/", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Ошибка сервера: ${response.status} ${response.statusText}`);
      }

    } catch (error) {
      clearInterval(uploadState.intervalID); // Очистка интервала при ошибке
      console.error("Ошибка при отправке формы:", error);
    }
  }

  // Функция для скачивания файла
  const downloadFile = (fileData, fileName, mime_type) => {
    try {
      const byteString = atob(fileData);

      const arrayBuffer = new ArrayBuffer(byteString.length);
      const uint8Array = new Uint8Array(arrayBuffer);

      for (let i = 0; i < byteString.length; i++) {
        uint8Array[i] = byteString.charCodeAt(i);
      }

      const blob = new Blob([uint8Array], { type: mime_type });
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
      window.location.reload()
    } catch (error) {
      console.error("Ошибка при скачивании файла:", error);
    }
  };

  // Обработка отправки формы
  const onSubmitForm = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);

    setUploadState((prevState) => ({
      ...prevState,
      filenames: formData.getAll("files")
    }));

    formData.delete('files')
    formData.append('foldername', uploadState.files_folder)

    setModalState((prevState) => ({
      ...prevState,
      isTriggered: true,
      status: "Обработка",
      animation: "progress",
    }));

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
      setModalState((prevState) => ({
        ...prevState,
        isTriggered: true,
        animation: "fail",
        status: "Произошла ошибка при отправке формы",
      }));
    }
  };

  const onSuccess = useCallback((filename, file, mime_type) => {
    downloadFile(file, filename, mime_type);
    setModalState({
      isTriggered: true,
      animation: "success",
      status: "Окно будет закрыто через 3 секунды",
    });

    setTimeout(() => {
      setModalState({
        isTriggered: false,
        animation: "",
        status: "",
      });
    }, 3000);
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
      <ProgressPopup 
        modalState={modalState}
        setModalState={setModalState}
        uploadState={uploadState}
        fileInputValueRef={fileInputValueRef}
      />
      <div className="card col-xl-6 position-relative">
        <h3 className="text-center card-header">Уменьшение размера PDF файлов</h3>
        <div className="card-body d-flex flex-column">
          <h6 className="text-center card-title mb-3">
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
                  type="file"
                  id="formFileMultiple"
                  name="files"
                  ref={fileInputValueRef.current}
                  multiple
                  style={{ border: isDragging && "4px solid red" }}
                  onChange={(event) => {
                    setProgressState((prevState) => ({
                      ...prevState,
                      isProgress: true
                    }))
                    createChunks(event)
                  }}
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