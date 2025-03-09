import shutil
from asyncio import sleep
from base64 import b64encode
from mimetypes import guess_type
from pathlib import Path
from typing import Annotated

from fastapi import (
    BackgroundTasks,
    Body,
    FastAPI,
    File,
    Form,
    UploadFile,
    status,
)
from fastapi.exceptions import HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .celery.tasks import assemble_chunks, compress_pdf, terminate_task

app = FastAPI()

origins: list[str] = [
    "http://localhost:8000",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR: Path = Path(__file__).resolve().parent.parent
FILES_DIR: Path = BASE_DIR / "files"

FILES_DIR.mkdir(parents=True, exist_ok=True)


@app.post("/compress/")
async def compress_file(
    compression: Annotated[int, Form(ge=69, le=150)],
    foldername: Annotated[str, Form()],
) -> dict:
    folder_path: Path = FILES_DIR / foldername / "pdfs"
    try:
        task = compress_pdf.delay(
            compression=int(compression),
            folder_path=str(folder_path),
        )
        return {"task_id": task.id}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@app.get("/task/{task_id}/")
async def get_task_status(background_tasks: BackgroundTasks, task_id: str):
    """Get status of a task"""

    task = compress_pdf.AsyncResult(task_id)
    try:
        if task.state == "PENDING":
            return {
                "status": "pending",
                "filename": None,
                "file": None,
                "mime_type": None,
            }
        elif task.state == "SUCCESS" and not isinstance(task.result, BaseException):
            result_path: Path = Path(task.result["result_path"])
            mime_type, _ = guess_type(result_path)
            if not mime_type:
                raise ValueError(
                    f"Не удалось определить MIME-типдля файла: {result_path}"
                )
            is_pdf = mime_type == "application/pdf"
            filename = result_path.stem if is_pdf else "compressed.zip"
            with open(result_path, "rb") as file:
                content = file.read()
                encoded_file = b64encode(content).decode("utf-8")
            return {
                "status": "success",
                "filename": filename,
                "file": encoded_file,
                "mime_type": mime_type,
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(task.info)
            )
    finally:
        if task.state != "PENDING" and not isinstance(task.result, BaseException):
            result_path = task.result["result_path"]
            background_tasks.add_task(lambda: shutil.rmtree(Path(result_path).parent))


@app.post("/upload-chunk/")
async def upload_chunk(
    chunk_index: Annotated[int, Form(ge=0)],
    total_chunks: Annotated[int, Form(ge=1)],
    filename: Annotated[str, Form()],
    foldername: Annotated[str, Form()],
    chunk: UploadFile = File(...),
):
    clean_filename: str = filename
    document_path: Path = FILES_DIR / foldername / "chunks" / clean_filename
    pdfs_path: Path = FILES_DIR / foldername / "pdfs"

    document_path.mkdir(parents=True, exist_ok=True)
    pdfs_path.mkdir(parents=True, exist_ok=True)

    chunk_path = document_path / f"chunk_{chunk_index:03d}"
    with open(chunk_path, "wb") as f:
        f.write(await chunk.read())

    if sum(1 for _ in document_path.iterdir()) == total_chunks:
        task = assemble_chunks.delay(
            {
                "filename": filename,
                "chunks_path": str(document_path),
                "foldername": foldername,
                "total_chunks": total_chunks,
                "result_path": str(pdfs_path),
            }
        )
        return {"task_id": task.id}
    return {
        "status": "success",
        "message": (
            f"Chunk {clean_filename}:{chunk_index + 1} of {total_chunks} uploaded."
        ),
    }


@app.post("/cancel_task/{task_id}/")
async def cancel_task(
    task_id: str,
    foldername: str = Body(...),
):
    terminate_task.delay(task_id=task_id, folder_path=str(FILES_DIR / foldername))
    task = terminate_task.AsyncResult(task_id)
    while True:
        if task.successful():
            return {"message": "Task cancelled successfully", "result": task.result}
        await sleep(3)
