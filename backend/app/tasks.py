import subprocess
from pathlib import Path
from zipfile import ZipFile

from celery import Celery
from fastapi import status
from fastapi.exceptions import HTTPException

from .validators import validate_file_extension
from .dataclasses import UserFile

celery_app = Celery(
    'compress',
    broker='redis://redis:6379/0',
    backend='redis://redis:6379/0'
)


@celery_app.task
def compress_pdf(
    compression: int, files: list[dict], tmp_dir: str
) -> dict:
    """Sends files to _ghost_compress function, puts them into an
    archive if there is more than one and sends resulting path back to
    FastAPI"""

    dir_path: Path = Path(tmp_dir)
    normal_file: UserFile
    if len(files) == 1:
        normal_file = UserFile(**files[0])
        if validate_file_extension(Path(normal_file.filename or '')):
            result_path = _ghost_compress(dir_path, compression, normal_file)
    else:
        result_path = dir_path / 'compressed.zip'
        with ZipFile(result_path, "w") as archive:
            for file in files:
                normal_file = UserFile(**file)
                if validate_file_extension(Path(normal_file.filename or '')):
                    pdf_path = _ghost_compress(
                        dir_path, compression, normal_file
                    )
                    archive.write(pdf_path, arcname=pdf_path.name)
    return {'result_path': str(result_path), 'tmp_dir': str(dir_path)}


def _ghost_compress(
    tmp_dir: Path, compression: int, file: UserFile
) -> Path:
    """Compresses recieved files using ghostscript
    based on compression (dpi) value"""

    filename: Path = Path(file.filename or '')
    compressed_pdf_path: Path = tmp_dir / f"{filename.stem}_compressed.pdf"
    original_pdf_path: Path = tmp_dir / filename

    with open(original_pdf_path, 'wb') as temp_file:
        temp_file.write(file.content)

    gs_command = [
        'gs',
        '-sDEVICE=pdfwrite',
        '-dCompatibilityLevel=1.4',
        '-dPDFSETTINGS=/screen',
        f'-dColorImageResolution={compression}',
        f'-dGrayImageResolution={compression}',
        '-dColorImageDownsampleType=/Bicubic',
        '-dAutoFilterColorImages=false',
        '-dDownsampleColorImages=true',
        '-dDownsampleGrayImages=true',
        '-dColorImageFilter=/DCTEncode',
        '-dDetectDuplicateImages=true',
        '-dCompressFonts=true',
        '-dNOPAUSE',
        '-dQUIET',
        '-dBATCH',
        f'-sOutputFile={compressed_pdf_path}',
        str(original_pdf_path)
    ]
    try:
        subprocess.run(gs_command, check=True)
        return compressed_pdf_path
    except subprocess.CalledProcessError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Error occured: {e}'
        )
