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
from google import genai
import typing_extensions as typing
from database import get_db_connection
from psycopg2.extras import RealDictCursor


#  gemini LLM client configuration

# GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
# client = genai.Client(api_key=GEMINI_API_KEY)
# if not GEMINI_API_KEY:
#     raise ValueError("GEMINI_API_KEY is missing from environment variables"


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
# OLDER VERSION BELOW WITH DOCTOR RESULT -------------------------------------------
# class DoctorResult(BaseModel):
#     doctor_name: str
#     specialty: str
#     qualification: str
#     hospital_name: str
#     hospital_type: str
#     city: str
#     district: str
#     country: str
#     next_available: Optional[str] = None
# class AnalysisResponse(BaseModel):
#     summary: str
#     diagnostic_alert: dict
#     recommended_tests: List[dict]
#     relief_remedies: List[dict]
#     recommended_doctors: List[DoctorResult]
#     nearby_clinics: List[dict]
#     keywords: List[str]
# OLDER VERSION ABOVE WITH DOCTOR RESULT -------------------------------------------
class AnalysisResponse(BaseModel):
    summary: str
    diagnostic_alert: dict
    recommended_tests: List[dict]
    relief_remedies: List[dict]
    recommended_doctors: List[dict]
    nearby_clinics: List[dict]
    keywords: List[str]

# # ---------------------------
# # Function: Generate comprehensive medical analysis
# # ---------------------------
# def generate_medical_analysis(description: str, duration: str, severity: int, 
#                               location: List[str], context: List[str]):
#     """Generate medical analysis using Gemini LLM"""
    
#     # Build context string
#     context_str = ", ".join(context) if context else "None"
#     location_str = ", ".join(location)
    
#     prompt = f"""You are a medical AI assistant helping with pre-consultation symptom analysis.

# Patient Information:
# - Symptom Description: {description}
# - Duration: {duration}
# - Severity (1-10): {severity}
# - Body Location: {location_str}
# - Additional Context: {context_str}

# Please provide a comprehensive analysis in JSON format with the following structure:

# {{
#   "diagnostic_summary": "A 2-3 sentence explanation of what the symptoms might indicate",
#   "severity_level": "Mild/Moderate/Severe",
#   "contagious_likely": true/false,
#   "recommended_tests": [
#     {{"name": "Test Name", "reason": "Why this test is needed"}},
#     ...
#   ],
#   "relief_remedies": [
#     {{"remedy": "Remedy name", "description": "How it helps"}},
#     ...
#   ],
#   "specialist_keywords": ["keyword1", "keyword2", ...],
#   "urgency": "within_24_hours/within_week/routine_checkup",
#   "recommended_actions": ["action1", "action2", ...]
# }}

# Important: 
# 1. Be medically accurate but avoid making definitive diagnoses
# 2. Focus on common conditions that match the symptoms
# 3. Recommend appropriate medical specialties
# 4. Suggest realistic next steps
# 5. Return ONLY valid JSON, no additional text"""

#     try:
#         message = genai.GenerativeModel(
#             model_name="gemini-1.5-flash",
#         generation_config={
#             "response_mime_type": "application/json",
#             "response_schema": MedicalSummary,
#             "temperature": 0.2,
#             "top_p": 0.9,
#             "max_output_tokens": 512
#         }
#     )
# # Gemini Flash is used for fast, low-latency medical summarization.
# # Deterministic settings are chosen to ensure consistency and safety.

        
#         response_text = message.content[0].text
        
#         # Clean response if it has markdown code blocks
#         if "```json" in response_text:
#             response_text = response_text.split("```json")[1].split("```")[0].strip()
#         elif "```" in response_text:
#             response_text = response_text.split("```")[1].split("```")[0].strip()
        
#         analysis = json.loads(response_text)
#         return analysis
        
#     except json.JSONDecodeError as e:
#         print(f"JSON decode error: {e}")
#         print(f"Response text: {response_text}")
#         # Return a fallback response
#         return {
#             "diagnostic_summary": "Unable to process analysis. Please consult a healthcare professional.",
#             "severity_level": "Moderate",
#             "contagious_likely": False,
#             "recommended_tests": [],
#             "relief_remedies": [],
#             "specialist_keywords": ["general physician"],
#             "urgency": "within_week",
#             "recommended_actions": ["Consult a doctor"]
#         }
#     except Exception as e:
#         print(f"Error in AI analysis: {e}")
#         raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)}")


@app.post("/symptom-check",response_model=AnalysisResponse)
def analyze_symptoms(data: SymptomData):
    # 1. Map symptom → specialties
    specialties = get_specialties_from_problem(data.description)
    
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
        "summary": f"Based on your symptoms, you may need a {', '.join(specialties)} consultation.",
        "diagnostic_alert": {
            "severity": "Moderate",
            "contagious": False
        },
        "recommended_tests": [],
        "relief_remedies": [],
        "recommended_doctors": doctors,
        "nearby_clinics": clinics,
        "keywords": specialties
    }
# OLDER CODE HERE -------------------------------------------------------
    # for row in rows:
    #     doctors.append({
    #         "doctor_name": row["doctor_name"],
    #         "specialty": row["specialty"],
    #         "qualification": row["qualification"],
    #         "hospital_name": row["hospital_name"],
    #         "hospital_type": row["hospital_type"],
    #         "city": row["city"],
    #         "district": row["district"],
    #         "country": row["country"],
    #     })
    #     if row["hospital_name"] not in clinics_seen:
    #         clinics_seen.add(row["hospital_name"])
    #         clinics.append({
    #             "name": row["hospital_name"],
    #             "type": row["hospital_type"],
    #             "address": row["address"],
    #             "city": row["city"],
    #             "district": row["district"],
    #             "country": row["country"]
    #         })

    # return {
    #      # LLM OUTPUT -----------------
    #     "summary": "Please consult the recommended doctors and nearby clinics.",
    #     "diagnostic_alert": {"severity": "Moderate", "contagious": False, "urgency": "within_week"},
    #     "recommended_tests": [],
    #     "relief_remedies": [],
    #     # LLM OUTPUT ------------------
    #     "recommended_doctors": doctors,
    #     "nearby_clinics": clinics,
    #     "keywords": specialties
    # }
# OLDER CODE HERE -------------------------------------------------------
# ---------------------------
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