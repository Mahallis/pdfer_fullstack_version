from base64 import b64encode
from mimetypes import guess_type
from pathlib import Path
import shutil
from typing import Annotated

from fastapi import FastAPI, UploadFile, BackgroundTasks, File, Form
from fastapi.exceptions import HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .tasks import compress_pdf, assemble_chunks

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
PDFS_DIR: Path = BASE_DIR / 'pdfs'
CHUNKS_DIR: Path = BASE_DIR / 'chunks'

BASE_DIR.mkdir(parents=True, exist_ok=True)
PDFS_DIR.mkdir(parents=True, exist_ok=True)
CHUNKS_DIR.mkdir(parents=True, exist_ok=True)


@app.post("/compress/")
async def compress_file(
    compression: Annotated[int, Form(ge=69, le=150)],
    foldername: Annotated[str, Form()],
) -> dict:

    folder_path: str = str(PDFS_DIR / foldername)
    try:
        task = compress_pdf.delay(
            compression=int(compression),
            folder_path=folder_path,
        )
        return {'task_id': task.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/task/{task_id}")
async def get_task_status(
    background_tasks: BackgroundTasks,
    task_id: str
):
    """Get status of a task"""

    task = compress_pdf.AsyncResult(task_id)
    try:
        if task.state == "PENDING":
            return {"status": "pending"}
        elif task.state == "SUCCESS":
            result_path: Path = Path(task.result['result_path'])
            mime_type, _ = guess_type(result_path)
            if not mime_type:
                raise ValueError(
                    f"Не удалось определить MIME-тип для файла: {result_path}"
                )

            with open(result_path, 'rb') as file:
                content = file.read()
                encoded_file = b64encode(content).decode("utf-8")
            return {
                'status': 'success',
                'file': encoded_file,
                'mime_type': mime_type
            }
        else:
            return {"status": "failed", "error": str(task.info)}
    finally:
        if task.state != "PENDING":
            background_tasks.add_task(lambda: shutil.rmtree(Path(task.result['result_path']).parent))


@app.post('/upload-chunk/')
async def upload_chunk(
    chunk_index: Annotated[int, Form(ge=0)],
    total_chunks: Annotated[int, Form(ge=1)],
    filename: Annotated[str, Form()],
    foldername: Annotated[str, Form()],
    chunk: UploadFile = File(...),
):
    clean_filename: str = filename
    document_path = CHUNKS_DIR / foldername / clean_filename
    document_path.mkdir(parents=True, exist_ok=True)

    chunk_path = document_path / f'chunk_{chunk_index:03d}'
    with open(chunk_path, "wb") as f:
        f.write(await chunk.read())

    if sum(1 for _ in document_path.iterdir()) == total_chunks:
        task = assemble_chunks.delay({
            'filename': filename,
            'chunks_path': str(document_path),
            'foldername': foldername,
            'total_chunks': total_chunks,
            'result_path': str(PDFS_DIR),
        })

        # TODO: Remove foldername folder compressing
        return {'task_id': task.id}
    return {
        "status": "success",
        "message": (
            f'Chunk {clean_filename}:'
            f'{chunk_index + 1} of {total_chunks} uploaded.'
            )
        }
