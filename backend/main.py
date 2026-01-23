from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from openai import OpenAI
import psycopg2
from psycopg2.extras import RealDictCursor
import json

# ---------------------------
# PostgreSQL connection
# ---------------------------
conn = psycopg2.connect(
    dbname="kantancare",
    user="postgres",
    password="apala",
    host="localhost",
    port="5432"
)

# ---------------------------
# Gemini LLM client
# ---------------------------
client = OpenAI(api_key="YOUR_GEMINI_API_KEY")

# ---------------------------
# FastAPI app
# ---------------------------
app = FastAPI(title="KantanCare Pre-Consultation API")

# ---------------------------
# Request model
# ---------------------------
class SymptomRequest(BaseModel):
    description: str
    duration: str
    severity: int
    location: str

# ---------------------------
# Function: generate summary & keywords
# ---------------------------
def generate_summary_and_keywords(description, duration, severity, location):
    prompt = f"""
You are a medical assistant. A patient reported the following:

Symptom description: "{description}"
Duration: "{duration}"
Severity (1-10): {severity}
Body location: "{location}"

1. Generate a concise summary (1-2 sentences) that explains the symptom to the user in simple words, including the possible tests they may have to get at the listed hospitals. 
2. Extract 3-5 keywords suitable for querying a doctor/specialty database.

Return as JSON like this:
{{
  "summary": "...",
  "keywords": ["...", "..."]
}}
"""
    response = client.chat.completions.create(
        model="gemini-1.5",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.5
    )

    result_text = response.choices[0].message.content

    # Parse JSON safely
    try:
        result_json = json.loads(result_text)
    except json.JSONDecodeError:
        result_json = {"summary": result_text, "keywords": []}

    return result_json

# ---------------------------
# FastAPI /search endpoint
# ---------------------------
@app.post("/search")
def search_doctors(request: SymptomRequest):
    # Step 1: Generate summary & keywords from LLM
    llm_result = generate_summary_and_keywords(
        request.description,
        request.duration,
        request.severity,
        request.location
    )

    keywords = llm_result.get("keywords", [])
    summary = llm_result.get("summary", "")

    if not keywords:
        return {"summary": summary, "results": [], "message": "No keywords generated"}

    try:
        # Step 2: Query PostgreSQL for doctors matching keywords
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            SELECT d.name AS doctor_name, d.specialty, d.qualification,
                   h.name AS hospital_name, h.type AS hospital_type,
                   l.city, l.district, l.country
            FROM problem_specialty_map p
            JOIN doctors d ON d.specialty = p.specialty
            JOIN hospitals h ON d.hospital_id = h.id
            JOIN locations l ON h.location_id = l.id
            WHERE LOWER(p.problem) = ANY(%s)
            ORDER BY p.confidence DESC
            LIMIT 10;
        """, (keywords,))
        results = cur.fetchall()
        cur.close()

        return {
            "summary": summary,
            "keywords": keywords,
            "results": results
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
