from pathlib import Path
from fastapi import status
from fastapi.exceptions import HTTPException


def validate_file_extension(filename: Path):
    if str(filename.suffix).lower() != '.pdf':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f'File extension of {filename} is not .pdf'
        )
    return filename
