from os import makedirs
from PIL import Image
from zipfile import ZipFile
from pathlib import Path
from fastapi import UploadFile
from pdf2image.pdf2image import convert_from_path

from validators import validate_file_extension


async def compress_pdf(
    params: dict, files: list[UploadFile], tmp_dir: Path
) -> Path:
    """Reduces file size converting a pdf pages to
    jpg images, reducing their quality and then merging into one pdf file"""

    if len(files) == 1:
        file: UploadFile = files[0]
        if validate_file_extension(Path(file.filename or '')):
            return await _pdf_to_img_convert(tmp_dir, params, file)

    archive_path = tmp_dir / 'compressed.zip'
    with ZipFile(archive_path, "w") as archive:
        for file in files:
            if validate_file_extension(Path(file.filename or '')):
                pdf_path = await _pdf_to_img_convert(tmp_dir, params, file)
                archive.write(pdf_path, arcname=pdf_path.name)
    return archive_path


async def _pdf_to_img_convert(
    tmp_dir: Path, form: dict, file: UploadFile
) -> Path:
    """Converts pdf to jpg, compresses it and converts it back"""

    filename = Path(file.filename or '')
    compressed_pdf_path = tmp_dir / f"{filename.stem}_compressed.pdf"

    original_pdf_path = tmp_dir / filename
    images_dir = tmp_dir / 'images'
    makedirs(images_dir, exist_ok=True)

    with open(original_pdf_path, 'wb') as temp_file:
        while chunk := await file.read(1024 * 1024):
            temp_file.write(chunk)

    convert_from_path(
        original_pdf_path,
        dpi=form['dpi'],
        grayscale=form['grayscale'],
        output_folder=images_dir,
        output_file='page',
        fmt='jpg'
    )
    return await _img_to_pdf_compress(
        images_dir,
        form['quality'],
        compressed_pdf_path
    )


async def _img_to_pdf_compress(
    images_dir: Path,
    quality: int,
    compressed_pdf_path: Path
) -> Path:

    pillow_params = {
        'fp': compressed_pdf_path,
        'format': "PDF",
        'quality': quality,
        'save_all': True,
    }
    image_files = sorted(images_dir.glob('page*.jpg'))

    for num, image_file in enumerate(image_files):
        with Image.open(image_file) as img:
            img = img.convert('RGB')
            if num == 0:
                img.save(
                    **pillow_params,
                    append_images=[]
                )
            img.save(
                **pillow_params,
                append_images=[img],
                append=True
            )

    return compressed_pdf_path
