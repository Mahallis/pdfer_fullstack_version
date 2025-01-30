from uuid import uuid4
from os import makedirs
from shutil import rmtree
from pathlib import Path
from typing import List, Annotated

from fastapi import FastAPI, UploadFile, BackgroundTasks, File, Form
from fastapi.exceptions import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from .compress import compress_pdf

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
    background_tasks: BackgroundTasks,
    files: Annotated[List[UploadFile], File],
    compression: Annotated[int, Form(ge=69, le=150)],
) -> FileResponse:

    tmp_dir = BASE_DIR / str(uuid4())
    try:
        makedirs(tmp_dir, exist_ok=True)

        result_path: Path = await compress_pdf(
            compression=int(compression),
            files=files,
            tmp_dir=tmp_dir
        )
        return FileResponse(
            path=result_path,
            filename=result_path.name
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        background_tasks.add_task(lambda: rmtree(tmp_dir))
