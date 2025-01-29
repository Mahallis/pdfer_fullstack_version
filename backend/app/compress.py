import subprocess
from zipfile import ZipFile
from pathlib import Path
from fastapi import UploadFile

from .validators import validate_file_extension


async def compress_pdf(
    compression: int, files: list[UploadFile], tmp_dir: Path
) -> Path:
    """Reduces file size converting a pdf pages to
    jpg images, reducing their quality and then merging into one pdf file"""

    if len(files) == 1:
        file: UploadFile = files[0]
        if validate_file_extension(Path(file.filename or '')):
            return await ghost_compress(tmp_dir, compression, file)

    archive_path = tmp_dir / 'compressed.zip'
    with ZipFile(archive_path, "w") as archive:
        for file in files:
            if validate_file_extension(Path(file.filename or '')):
                pdf_path = await ghost_compress(tmp_dir, compression, file)
                archive.write(pdf_path, arcname=pdf_path.name)
    return archive_path


async def ghost_compress(
    tmp_dir: Path, compression: int, file: UploadFile
) -> Path:
    filename: Path = Path(file.filename or '')
    compressed_pdf_path: Path = tmp_dir / f"{filename.stem}_compressed.pdf"

    original_pdf_path: Path = tmp_dir / filename

    with open(original_pdf_path, 'wb') as temp_file:
        content = await file.read()
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
    subprocess.run(gs_command, check=True)
    return compressed_pdf_path
