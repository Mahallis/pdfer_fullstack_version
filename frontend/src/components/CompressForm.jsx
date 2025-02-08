import { useState } from "react";
import ProgressPopup from "./ProgressPopup/ProgressPopup";

export default function CompressForm() {
  const compression = [
    { value: "69", label: "Экстремальное сжатие", selected: false },
    { value: "100", label: "Нормальное сжатие", selected: true },
    { value: "150", label: "Максимальное качество", selected: false },
  ];
  let taskID;
  let intervalID;
  let files_folder;
  let filenames;

  const [modalState, setModalState] = useState({
    isTriggered: false,
    status: "",
    animation: "progress",
  });

  const [isDragging, setIsDragging] = useState(false);

  const generateFolderName = () => {
    const uuid = crypto.randomUUID()
    const timestamp = Date.now()
    return `${uuid}_${timestamp}`
  }

  const createChunks = (event) => {
    event.preventDefault()
    let chunkSize = 1024 * 1024
    files_folder = generateFolderName()
    Array.from(event.target.files).forEach(async (file) => {
      if (file.type === "application/pdf") {
        let start = 0;
        let totalChunks = Math.round(file.size / chunkSize)
        for (let i = 0; i < totalChunks; i++) {
          const chunk = file.slice(start * chunkSize, (start + 1) * chunkSize);
          await uploadChunk(chunk, start, totalChunks, file.name, files_folder)
          start++ 
        }
      } else {
        alert('Вы загрузили не pdf документ.')
      }
    })
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

      const result = await response.json();
      console.log(result)

    } catch (error) {
      clearInterval(intervalID); // Очистка интервала при ошибке
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
    } catch (error) {
      console.error("Ошибка при скачивании файла:", error);
    }
  };

  // Функция для опроса результата задачи
  const pollResults = async (formData) => {
    try {
      const response = await fetch(`/api/task/${taskID}/`);
      if (!response.ok) {
        throw new Error(`Ошибка сервера: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      const { status, file, mime_type } = result;

      switch (status) {
        case "success":
          clearInterval(intervalID); // Очистка интервала
          setModalState({
              isTriggered: true,
              animation: 'success',
              status: "Окно будет закрыто через 3 секунды"
          })
          setTimeout(() => {
              setModalState({
                isTriggered: false,
                animation: "",
                status: ""
              });
            }, 3000);
          if (file) {
            const fileName = filenames.length > 1
            ? `${filenames.length}_files_compressed.zip`
            : `${filenames.name.slice(0, -4)}_compressed.pdf`;
            
              downloadFile(file, fileName, mime_type);
          } else {
            console.error("Файл не найден в ответе сервера.");
          }
          break;

        case "failure":
          clearInterval(intervalID); // Очистка интервала
          setModalState((prevState) => ({
            ...prevState,
            animation: "fail",
            status: "Произошла ошибка при обработке",
          }));
          break;

        case "pending":
          // Продолжаем опрос
          break;

        default:
          console.warn("Неизвестный статус задачи:", status);
      }
    } catch (error) {
      clearInterval(intervalID); // Очистка интервала при ошибке
      console.error("Ошибка при опросе результатов:", error);
      setModalState((prevState) => ({
        ...prevState,
        animation: "fail",
        status: "Произошла ошибка при опросе результатов",
      }));
    }
  };

  // Обработка отправки формы
  const onSubmitForm = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    filenames = formData.getAll("files")
    formData.delete('files')
    formData.append('foldername', files_folder)
    console.log(formData.entries())

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
      taskID = result.task_id;

      intervalID = setInterval(() => pollResults(formData), 2000);
    } catch (error) {
      clearInterval(intervalID); // Очистка интервала при ошибке
      console.error("Ошибка при отправке формы:", error);
      setModalState({
        isTriggered: true,
        animation: "fail",
        status: "Произошла ошибка при отправке формы",
      });
    }
  };

  return (
    <>
      <ProgressPopup modalState={modalState} setModalState={setModalState} />
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
                      <option key={option.value} value={option.value} selected={option.selected}>
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
                  onChange={createChunks}
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