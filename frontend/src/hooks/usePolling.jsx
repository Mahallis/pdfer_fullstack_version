import { useEffect, useRef } from "react";

export default function usePolling(
  taskID,
  isTriggered,
  onSuccess,
  onFailure,
  onPending
) {
  const intervalRef = useRef(null);
  const isStoppedRef = useRef(false); // <-- флаг остановки

  useEffect(() => {
    if (!isTriggered || !taskID) return;

    isStoppedRef.current = false; // <-- сбрасываем при новом запуске

    const poll = async () => {
      if (isStoppedRef.current) return; // <-- проверяем перед каждым запуском

      try {
        const response = await fetch(`/api/task/${taskID}/`);
        if (!response.ok && !isStoppedRef.current) {
          throw new Error(
            `Ошибка сервера: ${response.status} ${response.statusText}`
          );
        }

        if (isStoppedRef.current) return; // <-- проверяем после асинхронных операций

        const result = await response.json();
        const { status, filename, file, mime_type } = result;

        switch (status) {
          case "success":
            clearInterval(intervalRef.current);
            isStoppedRef.current = true;
            onSuccess(filename, file, mime_type);
            break;
          case "failure":
            clearInterval(intervalRef.current);
            isStoppedRef.current = true;
            onFailure();
            break;
          case "pending":
            onPending();
            break;
          default:
            console.warn("Неизвестный статус задачи:", status);
        }
      } catch (error) {
        if (isStoppedRef.current) return; // <-- игнорируем ошибки после остановки
        console.error("Ошибка при опросе результатов:", error);
        onFailure();
      }
    };

    intervalRef.current = setInterval(poll, 7000);

    return () => {
      clearInterval(intervalRef.current);
      isStoppedRef.current = true; // <-- гарантируем остановку
    };
  }, [taskID, isTriggered, onSuccess, onFailure, onPending]);
}
