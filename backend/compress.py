from datetime import datetime
from zipfile import ZipFile
from pathlib import Path
from fastapi import UploadFile
from pdf2image.pdf2image import convert_from_bytes

from validators import validate_file_extension


async def compress_pdf(
    params: dict, files: list[UploadFile], tmp_dir: Path
) -> Path:
    """Reduces file size converting a pdf pages to
    jpg images, reducing their quality and then merging into one pdf file"""

    if len(files) == 1:
        file: UploadFile = files[0]
        if validate_file_extension(Path(file.filename or '')):
            return await _pdf_to_img_compress(tmp_dir, params, file)

    archive_path = tmp_dir / 'compressed.zip'
    with ZipFile(archive_path, "w") as archive:
        for file in files:
            if validate_file_extension(Path(file.filename or '')):
                pdf_path = await _pdf_to_img_compress(tmp_dir, params, file)
                archive.write(pdf_path, arcname=pdf_path.name)
    return archive_path


async def _pdf_to_img_compress(
    file_path: Path, form: dict, file: UploadFile
) -> Path:
    """Converts pdf to jpg, compresses it and converts it back"""

    filename = file.filename or f'file_{datetime.now()}'
    pdf_path = file_path / f"{filename[0:-4]}_compressed.pdf"
    loaded_file = await file.read()

    page_image = convert_from_bytes(
        loaded_file, dpi=form['dpi'], grayscale=form['grayscale']
    )
    page_image[0].save(
        pdf_path,
        "PDF",
        quality=form["quality"],
        save_all=True,
        append_images=page_image[1:],
    )
    return pdf_path
