from uuid import uuid4
from os import makedirs
from shutil import rmtree
from pathlib import Path
from typing import List, Annotated

from fastapi import FastAPI, UploadFile, BackgroundTasks, File
from fastapi.exceptions import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from compress import compress_pdf

app = FastAPI()

origins = [
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent / "pdfs"
makedirs(BASE_DIR, exist_ok=True)


@app.post("/compress/")
async def compress_file(
    files: Annotated[List[UploadFile], File],
    background_tasks: BackgroundTasks,
    grayscale: bool = False,
    dpi: int = 100,
    quality: int = 60,
):
    try:
        tmp_dir = BASE_DIR / str(uuid4())
        makedirs(tmp_dir, exist_ok=True)
        final_file_path = await compress_pdf(
            {"grayscale": grayscale, "dpi": int(dpi), "quality": int(quality)},
            files,
            tmp_dir
        )
        return FileResponse(
            path=final_file_path,
            filename=final_file_path.name
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        background_tasks.add_task(lambda: rmtree(tmp_dir))
