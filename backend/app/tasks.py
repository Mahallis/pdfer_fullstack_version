import subprocess
from pathlib import Path
from zipfile import ZipFile

from celery import Celery
from fastapi import status
from fastapi.exceptions import HTTPException

celery_app = Celery(
    'compress',
    broker='redis://redis:6379/0',
    backend='redis://redis:6379/0'
)


@celery_app.task
def compress_pdf(compression: int, folder_path: str) -> dict:
    """Sends files to _ghost_compress function, puts them into an
    archive if there is more than one and sends resulting path back to
    FastAPI"""

    files: list[Path] = [f for f in Path(folder_path).iterdir()]
    if len(files) == 1:
        result_path = _ghost_compress(compression, files[0])
    else:
        result_path = Path(f'{folder_path}/compressed.zip')
        with ZipFile(result_path, "w") as archive:
            for file in files:
                pdf_path = _ghost_compress(
                    compression, file
                )
                archive.write(pdf_path, arcname=pdf_path.name)
    return {'result_path': str(result_path)}


def _ghost_compress(
    compression: int, file: Path
) -> Path:
    """Compresses recieved files using ghostscript
    based on compression (dpi) value"""

    result_filename: str = f"{file.stem}_compressed.pdf"
    compressed_pdf_path: Path = file.parent.parent / result_filename

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
        '-dNO_CFF_EMBED',
        '-dDOINTERPOLATE',
        '-dUseCIEColor=false',
        '-dNOPAUSE',
        '-dQUIET',
        '-dBATCH',
        f'-sOutputFile={compressed_pdf_path}',
        f'{file}'
    ]
    try:
        subprocess.run(gs_command, check=True)
        return compressed_pdf_path
    except subprocess.CalledProcessError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Error occured: {e}'
        )


@celery_app.task
def assemble_chunks(params: dict):
    result_path: Path = Path(params['result_path'])
    chunks_path: Path = Path(params['chunks_path'])

    assembled_path = result_path / params['filename']
    chunks = sorted([
        file for file in chunks_path.iterdir()
        if file.name.startswith('chunk_')
    ])
    if not len(chunks) == params['total_chunks']:
        raise Exception('Not enough chunks')
    with open(f'{assembled_path}', 'wb') as output_file:
        for chunk in chunks:
            with open(chunk, 'rb') as chunk_file:
                output_file.write(chunk_file.read())
            chunk.unlink()
    Path(chunks_path).rmdir()
    return {'status': 'done'}
