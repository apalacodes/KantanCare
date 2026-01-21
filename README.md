KantanCare — Local development setup
===================================

KantanCare is a compact medical frontend + FastAPI backend repository that provides a static React-like frontend, patient/doctor dashboard pages, and a simple AI recommendation/chat endpoint for prototyping telehealth workflows.

This repository contains a FastAPI backend and a static frontend (served by the backend in development).

Quick start (recommended)
-------------------------
1. Create and activate a Python virtual environment:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

2. Install backend dependencies:

```bash
pip install -r backend/requirements.txt
```

3. Configure secrets in a local `.env` file at the project root. Example `.env`:

```text
# OpenRouter API key (optional when using mock)
OPENROUTER_API_KEY=sk-...your-key-here

# Optional: use a mock response when OpenRouter is unreachable
USE_MOCK_OPENROUTER=1
```

4. Run the development server (serves frontend and API on port 8000):

```bash
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
# open http://localhost:8000
```

Notes
-----
- The backend mounts the `frontend/` directory and serves static files at `/`.
- If `USE_MOCK_OPENROUTER=1` the `/api/recommend` endpoint will return a canned response (useful offline).
- To enable real OpenRouter calls, set `OPENROUTER_API_KEY` in `.env` and unset `USE_MOCK_OPENROUTER`.
- If Firestore requests are blocked in the browser (net::ERR_BLOCKED_BY_CLIENT), try disabling ad/privacy extensions or run the Firebase emulator locally.

Docker / Compose
-----------------
The repo includes a `docker-compose.yml` that builds the backend and serves the static frontend with nginx. To run with Docker:

```bash
# build and run both services
docker-compose up --build

# or run only the backend service (it will expose port 8000)
docker-compose up --build backend
```

Troubleshooting
---------------
- 404 on `/` or 405 on `/api/recommend`: ensure the backend is running and that the `app.mount` for static files is after API route definitions (this repository already does this).
- `Internal Server Error` when calling `/api/recommend`: check that `OPENROUTER_API_KEY` is set or enable `USE_MOCK_OPENROUTER` for offline testing.

Development notes
-----------------
- Frontend files are in the `frontend/` folder. The AI chat widget is `frontend/ai-widget.js`.
- Backend entrypoint: `backend/main.py` (FastAPI + static file mount).

If you want, I can add a small `make` file or scripts to automate the steps above.

