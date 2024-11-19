# PDFer

<b>Приложение для уменьшения размера .pdf файлов.</b> <br><br>
Чтобы не мириться с ограничениями аналогичных сервисов в интернете, решил разработать собственный.

Изначально проект был написан полностью на Django, но чтобы иметь возможность более гибко настраивать отдельные его элементы, решил переписать с использованием FastAPI и React JS.

Дополнительно я переработал бизнес логику, чтобы уменьшить потребление оперативной памяти устройством.

В проекте использован следующий стек:

- <b>Бэкенд:</b>
  - FastAPI
  - Uvicorn
  - Pillow
  - pdf2image
- <b>Фронтенд:</b>
  - React JS
  - Bootstrap
- Nginx
- Docker

## Системные требования

На устройстве должны быть предварительно установлен Docker, все остальные необходимые пакеты будут развернуты в контенерах.

## Инструкция по запуску

1. Запустить контейнеры командой:

```bash
sudo docker compose up
```

2. По умолчанию проект будет доступент по адресу <a href="http://localhost:80">http://localhost:80</a>

## Планы по доработке проекта

1. Добавить тесты
2. Добавить именование сжатого файла из имени исходного в React
3. Добавить утилиту по организации pdf файлов.
