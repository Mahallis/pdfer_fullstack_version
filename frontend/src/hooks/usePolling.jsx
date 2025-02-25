import { useEffect, useRef } from "react";

export default function usePolling (taskID, isTriggered, onSuccess, onFailure, onPending) {
    const intervalRef = useRef(null);

    useEffect(() => {
        if (isTriggered) {
            const poll = async () => {
                try {
                    const response = await fetch(`/api/task/${taskID}/`);
                    if (!response.ok) {
                        throw new Error(`Ошибка сервера: ${response.status} ${response.statusText}`);
                    }
                    const result = await response.json();
                    const { status, filename, file, mime_type } = result;

                    switch (status) {
                        case "success":
                            clearInterval(intervalRef)
                            onSuccess(filename, file, mime_type)
                            break
                        case "failure":
                            clearInterval(intervalRef)
                            onFailure()
                            break
                        case "pending":
                            onPending();
                            break
                        default:
                            console.warn("Неизвестный статус задачи: ", status)
                    }
                } catch (error) {
                    console.error("Ошибка при опросе результатов:", error)
                    onFailure()
                }
            };
            intervalRef.current = setInterval(poll, 5000);

            return () => clearInterval(intervalRef.current)
        }
    }, [taskID, isTriggered, onSuccess, onFailure, onPending])
};
