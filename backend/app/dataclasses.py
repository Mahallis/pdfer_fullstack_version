from pathlib import Path

from pydantic import BaseModel


class UserFile(BaseModel):
    filename: str
    content: bytes


class ResultResponse(BaseModel):
    result_path: Path
    tmp_dir: Path
