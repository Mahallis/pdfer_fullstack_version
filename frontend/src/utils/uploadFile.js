export const createChunks = async (event, setUploadState, setProgressState, uploadState) => {
    // Function for creating chunks

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
          await uploadChunk(chunk, i, fileChunks, file.name, foldername, uploadState)
          setProgressState((prevState) => ({
            ...prevState,
            progressValue: prevState.progressValue < 100 
              ? Math.round((prevState.progressValue + step) * 100) / 100 
              : 100
          }))
        }
      } else {
        alert('Вы загрузили не pdf документ.')
        window.location.reload()
      }
    }

    setProgressState(() => ({
      progressValue: 0,
      isProgress: false
    }))
  }

const generateFolderName = () => {
    // Function for generating foldername

    const uuid = crypto.randomUUID()
    const timestamp = Date.now()
    return `${uuid}_${timestamp}`
}

const uploadChunk = async (chunk, index, total_chunks, filename, foldername, uploadState) => {
    // Function for uploading chunks to the server

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