from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import os
import httpx
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from fastapi.staticfiles import StaticFiles

OPENROUTER_URL = "https://api.openrouter.ai/v1/chat/completions"
MODEL = "google/gemma-3n-e2b-it:free"

# Load environment variables from a .env file when present
load_dotenv()
USE_MOCK = os.getenv("USE_MOCK_OPENROUTER", "false").lower() in ("1", "true", "yes")

app = FastAPI(title="KantanCare AI Recommendation")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve frontend static files if available (SPA)
BASE_FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"
# If a production build exists prefer serving `frontend/build`, otherwise serve the frontend folder (dev files)
FRONTEND_BUILD_DIR = BASE_FRONTEND_DIR / "build"
FRONTEND_DIR = FRONTEND_BUILD_DIR if FRONTEND_BUILD_DIR.exists() else BASE_FRONTEND_DIR


class RecommendRequest(BaseModel):
    symptoms: str
    age: int | None = None
    extra: str | None = None


class RecommendResponse(BaseModel):
    recommendation: str
    raw: dict | None = None


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/api/recommend", response_model=RecommendResponse)
async def recommend(req: RecommendRequest):
    api_key = os.getenv("OPENROUTER_API_KEY")
    if USE_MOCK:
        # Return a developer-friendly canned response when mocking is enabled
        mock_text = (
            "Mock recommendation:\n- Possible causes: Viral upper respiratory infection (common cold), influenza.\n"
            "- Suggested tests: None urgent; consider COVID/Flu test if symptomatic.\n- Urgency: Low to moderate — seek care if high fever or breathing difficulty.\n"
            "- Next steps: Rest, fluids, OTC antipyretics, monitor symptoms. Disclaimer: not medical advice."
        )
        return {"recommendation": mock_text, "raw": None}

    if not api_key:
        raise HTTPException(status_code=500, detail="OpenRouter API key not configured")

    system_prompt = (
        "You are a concise medical triage assistant. Provide likely causes, suggested tests, urgency level, "
        "and next steps in short bullet points. Always include a disclaimer that this is not a medical diagnosis."
    )

    user_content = f"Patient symptoms: {req.symptoms}\n"
    if req.age:
        user_content += f"Age: {req.age}\n"
    if req.extra:
        user_content += f"Context: {req.extra}\n"

    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ],
        "max_tokens": 512,
        "temperature": 0.2,
    }

    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}

    async with httpx.AsyncClient(timeout=30) as client:
        try:
            r = await client.post(OPENROUTER_URL, json=payload, headers=headers)
            r.raise_for_status()
            data = r.json()

            # Extract text from common response shapes
            content = None
            if isinstance(data, dict) and "choices" in data and len(data["choices"]) > 0:
                first = data["choices"][0]
                msg = first.get("message") or first.get("delta")
                if isinstance(msg, dict):
                    content = msg.get("content")
                else:
                    content = first.get("text")

            return {"recommendation": content or "", "raw": data}
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
        except Exception as e:
            # If mocking is enabled, return a canned response instead of failing
            if USE_MOCK:
                mock_text = (
                    "Mock recommendation (error fallback):\n- Possible causes: Viral upper respiratory infection.\n"
                    "- Suggested tests: None urgent.\n- Urgency: Low to moderate.\n- Next steps: Rest and monitor. Disclaimer: not medical advice."
                )
                return {"recommendation": mock_text, "raw": None}
            raise HTTPException(status_code=500, detail=str(e))


# Mount frontend static files after API routes so API endpoints are matched first
if FRONTEND_DIR.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")
