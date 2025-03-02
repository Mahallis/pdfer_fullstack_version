export const downloadFile = (fileData, fileName, mime_type, fileInputValueRef) => {
    // Функция для скачивания файла
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
        fileInputValueRef.current = null
    } catch (error) {
        console.error("Ошибка при скачивании файла:", error);
    }
};