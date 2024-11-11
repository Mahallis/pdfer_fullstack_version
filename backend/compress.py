from fastapi import UploadFile
from zipfile import ZipFile
from pathlib import Path

from pdf2image.pdf2image import convert_from_bytes


async def compress_pdf(form: dict, files, tmp_dir: Path) -> Path:
    """Reduces file size converting a pdf pages to
    jpg images, reducing their quality and then merging into one pdf file"""

    for file in files:
        await pdf_to_img_compress(tmp_dir, form, file)
    return generate_result_file(tmp_dir, "compressed")


async def pdf_to_img_compress(
    file_path: Path, form: dict, file: UploadFile
) -> None:
    """Converts pdf to jpg, compresses it and converts it back"""

    pdf_path = file_path / f"{file.filename[0:-4]}_compressed.pdf"
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


def generate_result_file(result_path: Path, name: str) -> Path:
    """Return a path to a compressed file if single file was
    uploaded or to an archive if multiple"""

    compressed_files = [file for file in result_path.glob("*.pdf")]
    if len(compressed_files) > 1:
        result_file_path = result_path / f"{name}.zip"
        with ZipFile(result_file_path, "w") as archive:
            for file in compressed_files:
                archive.write(file, arcname=file.name)
    else:
        result_file_path = compressed_files[0]
    return result_file_path
