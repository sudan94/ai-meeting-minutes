# MeetingMind AI

Automatically transcribe meeting recordings and generate structured minutes using AI. Upload an audio file, and the app returns a title, summary, key points, action items, identified participants, and the full transcript — all in seconds.

Built with **FastAPI + PostgreSQL** on the backend and **React + Material-UI** on the frontend. Runs fully containerised with Docker Compose.

---

## Features

- **Drag-and-drop audio upload** — MP3, WAV, M4A, OGG, FLAC supported
- **File size limit** — up to 25 MB; FFmpeg is available on the backend to compress if needed
- **AI transcription** — OpenAI Whisper API (`whisper-1`)
- **Structured extraction** — GPT-4o-mini returns title, summary, key points, action items, and participants as structured JSON
- **Tabbed meeting detail view** — Summary / Key Points / Action Items / Transcript
- **Real-time processing status** — progress bar polling while the background task runs
- **Trello integration** — push meeting minutes to a Trello card with one click
- **Pagination** — meeting list paginates at 5 per page
- **Delete meetings** — removes the database record and the stored audio file

---

## Architecture

```
Browser (React + MUI)
       │  REST / JSON
       ▼
FastAPI (Python 3.11)
  ├── POST /meeting/upload-audio        → saves file, starts background task
  ├── GET  /meeting/processing-status   → polls task progress
  ├── GET  /meeting/get_meetings        → paginated list
  ├── GET  /meeting/get_meeting_by_id   → full detail + transcript
  ├── DELETE /meeting/delete_meeting    → removes record + audio file
  └── GET  /meeting/send_to_trello      → creates Trello card
       │
       ├── OpenAI Whisper API  (transcription)
       ├── OpenAI GPT-4o-mini  (structured extraction)
       └── PostgreSQL          (meetings + transcriptions)
```

**Background task flow:**

```
Upload → Save audio → [FFmpeg compress if >24 MB] → Whisper API
       → Store transcript → GPT-4o-mini extraction → Store meeting → Done
```

---

## Project Structure

```
ai-meetings-minutes/
├── docker-compose.yml          # Production: postgres + backend + nginx frontend
├── docker-compose.dev.yml      # Development: hot-reload backend + React dev server
│
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── .env.example            # Copy to .env and fill in your keys
│   ├── main.py                 # FastAPI app, CORS, router registration
│   ├── config.py               # Settings loaded from .env
│   ├── database.py             # SQLAlchemy engine + session factory
│   ├── models/
│   │   └── models.py           # Meeting, Transcription, Trello ORM models
│   ├── schemas/
│   │   ├── meetingSchema.py
│   │   └── transcriptionSchema.py
│   ├── routers/
│   │   └── meeting.py          # Route definitions
│   ├── controller/
│   │   └── meetingController.py  # Business logic, AI calls, file handling
│   └── recordings/             # Audio files stored as recordings/YYYY/MM/<uuid>/
│
└── frontend/
    ├── Dockerfile              # Multi-stage: node build → nginx serve
    ├── nginx.conf
    ├── src/
    │   ├── App.tsx             # Theme, routing, NavBar
    │   ├── services/
    │   │   └── api.ts          # All API calls in one place
    │   └── components/
    │       ├── Home.tsx        # Drag-and-drop upload page
    │       ├── MeetingList.tsx # Paginated list with live processing status
    │       └── MeetingDetails.tsx  # Tabbed detail view + Trello button
    └── public/
```

---

## Quick Start (Docker)

**1. Clone and configure**

```bash
git clone <repo-url>
cd ai-meetings-minutes
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=yourpassword
POSTGRES_SERVER=localhost
POSTGRES_PORT=5432
POSTGRES_DB=ai_meeting_minutes

OPENAI_API_KEY=sk-...

# Optional — only needed for Trello integration
TRELLO_API_KEY=
TRELLO_API_TOKEN=
TRELLO_LIST_ID=
```

**2. Start production**

```bash
docker compose up --build
```

| Service  | URL                        |
|----------|---------------------------|
| Frontend | http://localhost:3000      |
| Backend  | http://localhost:8000      |
| API docs | http://localhost:8000/docs |

**3. Start dev mode** (hot reload on save)

```bash
docker compose -f docker-compose.dev.yml up --build
```

- Editing any `.py` file → uvicorn restarts automatically
- Editing any `.tsx`/`.ts` file → React dev server hot-reloads in the browser

---

## Manual Setup (without Docker)

### Prerequisites

- Python 3.11+
- Node.js 20+
- PostgreSQL 14+
- FFmpeg (`brew install ffmpeg` / `apt install ffmpeg` / [ffmpeg.org](https://ffmpeg.org))

### Backend

```bash
cd backend
python -m venv venv

# Windows
.\venv\Scripts\activate
# Linux / Mac
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env   # then fill in your values
uvicorn main:app --reload
# → http://localhost:8000
```

### Frontend

```bash
cd frontend
npm install
# create .env with:  REACT_APP_API_URL=http://localhost:8000/meeting
npm start
# → http://localhost:3000
```

---

## Environment Variables

| Variable           | Required | Description                                  |
|--------------------|----------|----------------------------------------------|
| `POSTGRES_USER`    | ✅       | PostgreSQL username                          |
| `POSTGRES_PASSWORD`| ✅       | PostgreSQL password                          |
| `POSTGRES_SERVER`  | ✅       | Host (`localhost` or `db` in Docker)         |
| `POSTGRES_PORT`    | ✅       | Default `5432`                               |
| `POSTGRES_DB`      | ✅       | Database name                                |
| `OPENAI_API_KEY`   | ✅       | Used for Whisper transcription + GPT-4o-mini |
| `TRELLO_API_KEY`   | ❌       | Trello Power-Up key                          |
| `TRELLO_API_TOKEN` | ❌       | Trello OAuth token                           |
| `TRELLO_LIST_ID`   | ❌       | Target list ID for new cards                 |

---

## API Reference

| Method   | Endpoint                              | Description                        |
|----------|---------------------------------------|------------------------------------|
| `POST`   | `/meeting/upload-audio`               | Upload audio; returns `task_id`    |
| `GET`    | `/meeting/processing-status/{task_id}`| Poll processing progress           |
| `GET`    | `/meeting/get_meetings`               | List meetings (`skip`, `limit`)    |
| `GET`    | `/meeting/get_meeting_by_id/{id}`     | Full meeting detail + transcript   |
| `DELETE` | `/meeting/delete_meeting/{id}`        | Delete meeting + audio file        |
| `GET`    | `/meeting/send_to_trello/{id}`        | Push minutes to Trello             |

Interactive docs available at `/docs` (Swagger) and `/redoc` when the backend is running.

---

## Tech Stack

| Layer       | Technology                        |
|-------------|-----------------------------------|
| Frontend    | React 19, TypeScript, Material-UI v7 |
| Backend     | FastAPI, Python 3.11, Uvicorn     |
| Database    | PostgreSQL 16, SQLAlchemy 2       |
| AI          | OpenAI Whisper API, GPT-4o-mini   |
| Audio       | FFmpeg (auto-compression)         |
| Containers  | Docker, Docker Compose            |
| Prod server | nginx (static + API proxy)        |

---

## License

MIT
