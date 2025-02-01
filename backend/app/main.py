from os import makedirs
from pathlib import Path
from shutil import rmtree
from typing import List, Annotated
from uuid import uuid4

from fastapi import FastAPI, UploadFile, BackgroundTasks, File, Form
from fastapi.exceptions import HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .tasks import compress_pdf

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

BASE_DIR: Path = Path(__file__).resolve().parent.parent / "pdfs"
makedirs(BASE_DIR, exist_ok=True)


@app.post("/compress/")
async def compress_file(
    files: Annotated[List[UploadFile], File],
    compression: Annotated[int, Form(ge=69, le=150)],
) -> dict:

    tmp_dir = BASE_DIR / str(uuid4())
    try:
        makedirs(tmp_dir, exist_ok=True)
        files_data: list[dict] = [{
            'filename': file.filename or '',
            'content': await file.read()
        } for file in files]

        task = compress_pdf.delay(
            compression=int(compression),
            files=files_data,
            tmp_dir=str(tmp_dir)
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
            return {"status": "success", "result": task.result}
        else:
            return {"status": "failed", "error": str(task.info)}
    finally:
        if task.state != "PENDING":
            rmtree(task.result['tmp_dir'])
