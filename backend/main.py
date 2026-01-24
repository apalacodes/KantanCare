import re
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from httpcore import request
from matplotlib import text, typing
from pydantic import BaseModel
from typing import List, Optional
import os
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import RealDictCursor
import json
import typing_extensions as typing
from database import get_db_connection
from psycopg2.extras import RealDictCursor
from openai import OpenAI 

# LLM client configuration
client = OpenAI( base_url="https://openrouter.ai/api/v1", 
                api_key=os.getenv("API_KEY"))


# ---------------------------
# FastAPI app
# ---------------------------
app = FastAPI(title="KantanCare Pre-Consultation API")

# Add CORS middleware to allow frontend requests
app.add_middleware(
    CORSMiddleware,
    # allow_origins=[
    #     "http://127.0.0.1:5500"],  #  Local development origins; will be replaced with production domains during deployment
   allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def extract_keywords(text: str) -> list[str]:
    """Preprocess symptom text into keywords"""
    text = text.lower()
    words = re.findall(r'\b\w+\b', text)
    print(text)
    print(words)
    return words


def get_specialties_from_problem(problem: str):
    keywords = extract_keywords(problem)
    print("keyword:", keywords)
    specialties = set()
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    for kw in keywords:
        cur.execute("""
            SELECT specialty
            FROM problem_specialty_map
            WHERE LOWER(problem) LIKE %s
        """, (f"%{kw}%",))
        results = cur.fetchall()
        for row in results:
            specialties.add(row['specialty'].strip())
    
    cur.close()
    conn.close()
    print(specialties)
    return list(specialties) if specialties else ["general physician"]

def get_doctors_and_clinics(
    specialties: List[str]
#     city: Optional[str] = None,
#     district: Optional[str] = None,
#     country: Optional[str] = None,
):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    cur.execute("""
        SELECT DISTINCT
            d.name AS doctor_name,
            d.specialty,
            d.qualification,
            h.name AS hospital_name,
            h.type AS hospital_type,
            h.address,
            l.city,
            l.district,
            l.country
        FROM doctors d
        JOIN hospitals h ON d.hospital_id = h.id
        JOIN locations l ON h.location_id = l.id
        WHERE LOWER(d.specialty) = ANY(%s)
    """, ([s.lower() for s in specialties],))

    # # Optional location filters
    # if city:
    #     query += " AND l.city = %s"
    #     params.append(city)
    # if district:
    #     query += " AND l.district = %s"
    #     params.append(district)
    # if country:
    #     query += " AND l.country = %s"
    #     params.append(country)
    results = cur.fetchall()
    print(results)
    cur.close()
    conn.close()
    return results

# ---------------------------
# Request/Response models
# ---------------------------
class SymptomData(BaseModel):
    description: str
    duration: Optional[str] = None
    severity: Optional[int] = None
    bodyParts: Optional[List[str]] = []
    context: Optional[List[str]] = []

class AnalysisResponse(BaseModel):
    summary: str
    diagnostic_alert: dict
    recommended_tests: List[dict]
    relief_remedies: List[dict]
    recommended_doctors: List[dict]
    nearby_clinics: List[dict]
    keywords: List[str]

@app.post("/symptom-check",response_model=AnalysisResponse)
def analyze_symptoms(data: SymptomData):
    myprompt = f""" You are a medical diagnostic assistant.
    Patient reports the following.
- Symptom Description: {data.description}
- Duration: {data.duration or 'N/A'}
- Severity (1-10): {data.severity or 'N/A'}
- Body Location: {', '.join(data.bodyParts) if data.bodyParts else 'N/A'}
- Additional Context: {', '.join(data.context) if data.context else 'N/A'}
    Please provide a comprehensive analysis-upto 3 tests and 2 quick remedies each in JSON format with the following structure:

    "description":"only problem keywords for database query"
    "diagnostic_summary": "A 2 sentence explanation of what the symptoms might indicate",
     "recommended_tests": [
        {{"name": "Test Name", "reason": "Why this test is needed"}},
     ...
     ],
    "relief_remedies": [
      {{"remedy": "Remedy name", "description": "How it helps"}},
      ...
      ],
     Return ONLY valid JSON, no additional text
"""

# ---------------------------
# Call OpenRouter chat endpoint
# ---------------------------
    completion = client.chat.completions.create(
        model="openai/gpt-5.2",
        messages=[
        {"role": "user", "content": myprompt}],
        max_tokens=1000,
        stream=False  # change to True if you want streaming 
        ) 
    output_text = completion.choices[0].message.content
    try:
        llm_data = json.loads(output_text)
    except json.JSONDecodeError:
        llm_data = {
            "description": "",
            "diagnostic_summary": "Unable to parse LLM output.",
            "recommended_tests": [],
            "relief_remedies": []
        }
    print("LLM Data:", llm_data)

    # 1. Map symptom → specialties
    specialties = get_specialties_from_problem(llm_data.get("description", ""))
    
    # # 2. Get doctors + clinics
    # doctors_and_clinics = get_doctors_and_clinics(
    #     specialties,
    #     city=data.context[0] if data.context else "Kathmandu",
    #     country="Nepal",
    #     district="Kathmandu"
    # )
    rows = get_doctors_and_clinics(specialties)
    # 3. Split doctors & clinics
    doctors = []
    clinics_seen = set()
    clinics = []

    for row in rows:
        # Doctors (frontend-compatible)
        doctors.append({
            "doctor_name": row["doctor_name"],
            "specialty": row["specialty"],
            "qualification": row["qualification"],
            "hospital_name": row["hospital_name"]
        })

        # Clinics (frontend expects distance + services)
        if row["hospital_name"] not in clinics_seen:
            clinics_seen.add(row["hospital_name"])
            clinic_location = ", ".join(filter(None, [
            row.get("address"),
            # row.get("city"),
            row.get("country")
    ]))
            clinics.append({
                "name": row["hospital_name"],
                "location": clinic_location,              
                "services": [row["hospital_type"]] if row["hospital_type"] else ["OPD"]
            })
    doctors = doctors[:5]
    return {
        "summary": f"Based on your symptoms, you may need a {', '.join(specialties)} consultation. {llm_data.get('diagnostic_summary', '')}",
        "diagnostic_alert": {
            "severity": "Moderate",
            "contagious": False
        },
        "recommended_tests": llm_data.get("recommended_tests", []),
        "relief_remedies": llm_data.get("relief_remedies", []),
        "recommended_doctors": doctors,
        "nearby_clinics": clinics,
        "keywords": specialties
    }
# Health check endpoint
# ---------------------------
@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "KantanCare API"}

# ---------------------------
# Test database connection endpoint
# ---------------------------
@app.get("/api/test-db")
def test_database():
    """Test database connection"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM doctors;")
        count = cur.fetchone()[0]
        cur.close()
        conn.close()
        return {"status": "connected", "doctor_count": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)