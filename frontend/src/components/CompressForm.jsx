import { useCallback, useState } from "react";
import ProgressPopup from "./ProgressPopup/ProgressPopup";
import usePolling from "../hooks/usePolling"

export default function CompressForm() {
  const compression = [
    { value: "69", label: "Экстремальное сжатие", selected: false },
    { value: "100", label: "Нормальное сжатие", selected: true },
    { value: "150", label: "Максимальное качество", selected: false },
  ];

  const [ uploadState, setUploadState ] = useState({
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
  const [ isProgress, setIsProgress ] = useState(false)

  const generateFolderName = () => {
    const uuid = crypto.randomUUID()
    const timestamp = Date.now()
    return `${uuid}_${timestamp}`
  }

  const createChunks = (event) => {
    event.preventDefault()
    let chunkSize = 1024 * 1024
    const chunkPromises = []
    let foldername = generateFolderName()
    setUploadState((prevState) => ({
      ...prevState,
      files_folder: foldername
    }))
    Array.from(event.target.files).forEach(async (file) => {
      if (file.type === "application/pdf") {
        let totalChunks = Math.ceil(file.size / chunkSize)
        for (let i = 0; i < totalChunks; i++) {
          const start = i * chunkSize;
          const end = Math.min((i + 1) * chunkSize, file.size);
          const chunk = file.slice(start, end);
          chunkPromises.push(uploadChunk(chunk, i, totalChunks, file.name, foldername))
        }
        await Promise.all(chunkPromises)
        setIsProgress(false)
      } else {
        alert('Вы загрузили не pdf документ.')
      }
    })
    return foldername
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
      status: "Обработка...",
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
      <ProgressPopup modalState={modalState} setModalState={setModalState} uploadState={uploadState} />
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
            <div className="row">
              <div className="col floating-group input-group-lg">
                <label htmlFor="formFileMultiple" className="form-label">
                  Загрузите один или несколько PDF файлов
                </label>
                <input
                  className="form-control"
                  type="file"
                  id="formFileMultiple"
                  name="files"
                  multiple
                  style={{ border: isDragging && "4px solid red" }}
                  onChange={(event) => {
                    setIsProgress(true)
                    createChunks(event)
                  }}
                  required
                />
              </div>
            </div>
            <div className="row mt-5">
              <button className="btn btn-primary" type="submit" disabled={isProgress}>
                { isProgress ? 'Загрузка файлов' : 'Сжать документы' }
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}