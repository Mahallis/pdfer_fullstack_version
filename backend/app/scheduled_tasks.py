from datetime import datetime, time, timedelta
from os import PathLike, listdir, path
from shutil import rmtree

from .main import FILES_DIR
from .tasks import celery_app

TIME_LIMIT = 300.0


@celery_app.task
def clean_unused_dirs(files_dir_path: str) -> None:
    dir_names: list = listdir(files_dir_path)
    for name in dir_names:
        dir_path: PathLike = path.join(files_dir_path, name)
        last_modified: time = datetime.fromtimestamp(path.getmtime(dir_path))
        modified_delta: timedelta = datetime.now() - last_modified
        if modified_delta.total_seconds() > TIME_LIMIT:
            rmtree(dir_path)


@celery_app.on_after_configure.connect
def setup_periodic_task(sender, **kwargs):
    sender.add_periodic_task(
        TIME_LIMIT, clean_unused_dirs.s(str(FILES_DIR)), name="clean every 30 seconds"
    )
