import subprocess
from pathlib import Path
from zipfile import ZipFile

from fastapi import UploadFile, status
from fastapi.exceptions import HTTPException

from .validators import validate_file_extension


async def compress_pdf(
    compression: int, files: list[UploadFile], tmp_dir: Path
) -> Path:
    """Sends files to _ghost_compress function, puts them into an
    archive if there is more than one and sends resulting path back to
    FastAPI"""

    if len(files) == 1:
        file: UploadFile = files[0]
        if validate_file_extension(Path(file.filename or '')):
            return await _ghost_compress(tmp_dir, compression, file)

    archive_path: Path = tmp_dir / 'compressed.zip'
    with ZipFile(archive_path, "w") as archive:
        for file in files:
            if validate_file_extension(Path(file.filename or '')):
                pdf_path = await _ghost_compress(tmp_dir, compression, file)
                archive.write(pdf_path, arcname=pdf_path.name)
    return archive_path


async def _ghost_compress(
    tmp_dir: Path, compression: int, file: UploadFile
) -> Path:
    """Compresses recieved files using ghostscript
    based on compression (dpi) value"""

    filename: Path = Path(file.filename or '')
    compressed_pdf_path: Path = tmp_dir / f"{filename.stem}_compressed.pdf"
    original_pdf_path: Path = tmp_dir / filename

    with open(original_pdf_path, 'wb') as temp_file:
        content: bytes = await file.read()
        temp_file.write(content)

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
