export const useFileUploader = (uploadState, toggleProgress) => {
  let files = uploadState.files
  let foldername = uploadState.files_folder

  const uploadChunk = async (chunk, index, totalChunks, filename, foldername) => {
    const formData = new FormData();
    formData.append("chunk", chunk);
    formData.append("chunk_index", index);
    formData.append("total_chunks", totalChunks);
    formData.append("filename", filename);
    formData.append("foldername", foldername);

    try {
      const response = await fetch("/api/upload-chunk/", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Ошибка сервера: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log(result);
    } catch (err) {
      console.error("Ошибка при отправке чанка:", err);
    }
  };

  const createChunksAndUpload = async () => {
    toggleProgress(true);
    const chunkSize = 1024 * 1024; // 1 MB
    const promises = [];

    for (const file of files) {
      if (file.type !== "application/pdf") {
        alert("Загружены не PDF-файлы.");
        return;
      }

      const totalChunks = Math.ceil(file.size / chunkSize);

      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min((i + 1) * chunkSize, file.size);
        const chunk = file.slice(start, end);
        promises.push(uploadChunk(chunk, i, totalChunks, file.name, foldername));
      }
    }

    await Promise.all(promises);
    toggleProgress(false);
  };
  createChunksAndUpload()
};