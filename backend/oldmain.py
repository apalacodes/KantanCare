
from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Float, Boolean, Text, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
import numpy as np
import pandas as pd
from transformers import AutoTokenizer, AutoModel, AutoModelForSequenceClassification, pipeline
import torch
import jwt
from passlib.context import CryptContext
import httpx
from geopy.distance import geodesic
import logging
from prometheus_client import Counter, Histogram, generate_latest
import redis
import json
from functools import lru_cache
import os

# CONFIGURATION 
class Settings:
    DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:pass@localhost/kantan_care")
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
    SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
    ALGORITHM = "HS256"
    ACCESS_TOKEN_EXPIRE = 30
    
    # AI Models
    CLINICAL_MODEL = "emilyalsentzer/Bio_ClinicalBERT"
    DIAGNOSIS_MODEL = "DrSyedFaizan/medReport"

settings = Settings()

#  LOGGING & MONITORING 
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Prometheus metrics
request_count = Counter('request_total', 'Total requests')
symptom_analysis_duration = Histogram('symptom_analysis_duration_seconds', 'Symptom analysis duration')

#  DATABASE MODELS 
Base = declarative_base()
engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    phone = Column(String, unique=True, index=True)
    password_hash = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Medical Profile
    age = Column(Integer)
    gender = Column(String)
    medical_history = Column(JSON)  # {conditions: [], medications: [], allergies: []}
    location_lat = Column(Float)
    location_lon = Column(Float)
    
    consultations = relationship("Consultation", back_populates="user")
    appointments = relationship("Appointment", back_populates="user")

class Consultation(Base):
    __tablename__ = "consultations"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Symptom Input
    symptoms_text = Column(Text)
    duration = Column(String)  # "hours", "days", "weeks"
    severity = Column(Integer)  # 1-10
    body_location = Column(String)
    associated_symptoms = Column(JSON)
    
    # AI Analysis
    ai_summary = Column(Text)
    potential_diagnoses = Column(JSON)  # [{diagnosis, confidence, priority}]
    recommended_tests = Column(JSON)
    recommended_specialists = Column(JSON)
    risk_flags = Column(JSON)
    
    # Doctor Review
    doctor_verified = Column(Boolean, default=False)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=True)
    doctor_notes = Column(Text)
    final_recommendations = Column(JSON)
    
    user = relationship("User", back_populates="consultations")
    doctor = relationship("Doctor", back_populates="consultations")

class Doctor(Base):
    __tablename__ = "doctors"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    email = Column(String, unique=True)
    specialization = Column(String)
    license_number = Column(String)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"))
    available = Column(Boolean, default=True)
    
    consultations = relationship("Consultation", back_populates="doctor")
    appointments = relationship("Appointment", back_populates="doctor")
    hospital = relationship("Hospital", back_populates="doctors")

class Hospital(Base):
    __tablename__ = "hospitals"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    address = Column(String)
    latitude = Column(Float)
    longitude = Column(Float)
    contact = Column(String)
    facilities = Column(JSON)  # ["lab", "imaging", "emergency"]
    specialties = Column(JSON)  # ["cardiology", "neurology"]
    
    doctors = relationship("Doctor", back_populates="hospital")
    appointments = relationship("Appointment", back_populates="hospital")

class Appointment(Base):
    __tablename__ = "appointments"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    doctor_id = Column(Integer, ForeignKey("doctors.id"))
    hospital_id = Column(Integer, ForeignKey("hospitals.id"))
    consultation_id = Column(Integer, ForeignKey("consultations.id"))
    
    scheduled_time = Column(DateTime)
    status = Column(String, default="scheduled")  # scheduled, completed, cancelled
    queue_position = Column(Integer)
    estimated_wait = Column(Integer)  # minutes
    
    user = relationship("User", back_populates="appointments")
    doctor = relationship("Doctor", back_populates="appointments")
    hospital = relationship("Hospital", back_populates="appointments")

Base.metadata.create_all(bind=engine)

#  PYDANTIC MODELS 
class UserCreate(BaseModel):
    email: str
    phone: str
    password: str
    age: int
    gender: str
    medical_history: Dict[str, List[str]] = Field(
        default={"conditions": [], "medications": [], "allergies": []}
    )
    location_lat: Optional[float] = None
    location_lon: Optional[float] = None

class SymptomInput(BaseModel):
    symptoms_text: str
    duration: str
    severity: int = Field(ge=1, le=10)
    body_location: Optional[str] = None
    associated_symptoms: List[str] = []

class ConsultationResponse(BaseModel):
    id: int
    ai_summary: str
    potential_diagnoses: List[Dict[str, Any]]
    recommended_tests: List[str]
    recommended_specialists: List[str]
    risk_flags: List[str]
    nearest_hospitals: List[Dict[str, Any]]

#  AI SERVICE 
class AIHealthService:
    def __init__(self):
        self.tokenizer = AutoTokenizer.from_pretrained(settings.CLINICAL_MODEL)
        self.model = AutoModel.from_pretrained(settings.CLINICAL_MODEL)
        self.classifier = pipeline("text-classification", model=settings.DIAGNOSIS_MODEL)
        
        # Load symptom-disease database
        self.symptom_db = self._load_symptom_database()
    
    def _load_symptom_database(self):
        """Load preprocessed Kaggle dataset"""
        # In production, load from CSV/database
        return {
            "fever": ["influenza", "covid-19", "dengue", "malaria"],
            "headache": ["migraine", "tension_headache", "sinusitis"],
            "chest_pain": ["heart_attack", "angina", "gerd", "anxiety"],
            # Add full dataset mapping
        }
    
    @symptom_analysis_duration.time()
    def analyze_symptoms(self, symptoms: SymptomInput, medical_history: Dict) -> Dict:
        """AI-powered symptom analysis"""
        
        # 1. Construct clinical narrative
        clinical_text = self._create_clinical_narrative(symptoms, medical_history)
        
        # 2. Extract embeddings
        inputs = self.tokenizer(clinical_text, return_tensors="pt", truncation=True, max_length=512)
        with torch.no_grad():
            embeddings = self.model(**inputs).last_hidden_state.mean(dim=1)
        
        # 3. Predict diagnoses
        diagnoses = self.classifier(clinical_text[:512], top_k=5)
        
        # 4. Risk assessment
        risk_flags = self._assess_risk(symptoms, diagnoses)
        
        # 5. Recommend tests and specialists
        tests = self._recommend_tests(diagnoses)
        specialists = self._recommend_specialists(diagnoses)
        
        return {
            "summary": self._generate_summary(symptoms, diagnoses),
            "diagnoses": diagnoses,
            "tests": tests,
            "specialists": specialists,
            "risk_flags": risk_flags
        }
    
    def _create_clinical_narrative(self, symptoms: SymptomInput, history: Dict) -> str:
        narrative = f"Patient presents with {symptoms.symptoms_text}. "
        narrative += f"Symptoms duration: {symptoms.duration}. Severity: {symptoms.severity}/10. "
        
        if history.get("conditions"):
            narrative += f"Medical history: {', '.join(history['conditions'])}. "
        if history.get("medications"):
            narrative += f"Current medications: {', '.join(history['medications'])}. "
        if history.get("allergies"):
            narrative += f"Known allergies: {', '.join(history['allergies'])}. "
        
        return narrative
    
    def _assess_risk(self, symptoms: SymptomInput, diagnoses: List) -> List[str]:
        flags = []
        
        # High severity
        if symptoms.severity >= 8:
            flags.append("HIGH_SEVERITY")
        
        # Emergency keywords
        emergency_keywords = ["chest pain", "difficulty breathing", "severe bleeding", 
                             "unconscious", "stroke", "heart attack"]
        if any(kw in symptoms.symptoms_text.lower() for kw in emergency_keywords):
            flags.append("EMERGENCY")
        
        # High confidence serious condition
        serious_conditions = ["heart_attack", "stroke", "sepsis", "pulmonary_embolism"]
        for diag in diagnoses:
            if diag['label'].lower() in serious_conditions and diag['score'] > 0.7:
                flags.append(f"CRITICAL_{diag['label'].upper()}")
        
        return flags
    
    def _recommend_tests(self, diagnoses: List) -> List[str]:
        test_map = {
            "heart_attack": ["ECG", "Troponin Test", "Chest X-ray"],
            "diabetes": ["Blood Glucose", "HbA1c", "Lipid Profile"],
            "influenza": ["Rapid Flu Test", "CBC"],
            "gerd": ["Endoscopy", "pH Monitoring"],
        }
        
        tests = set()
        for diag in diagnoses[:3]:
            label = diag['label'].lower()
            if label in test_map:
                tests.update(test_map[label])
        
        return list(tests)
    
    def _recommend_specialists(self, diagnoses: List) -> List[str]:
        specialist_map = {
            "heart": "Cardiologist",
            "lung": "Pulmonologist",
            "stomach": "Gastroenterologist",
            "brain": "Neurologist",
            "diabetes": "Endocrinologist",
        }
        
        specialists = set()
        for diag in diagnoses[:3]:
            for keyword, spec in specialist_map.items():
                if keyword in diag['label'].lower():
                    specialists.add(spec)
        
        return list(specialists) if specialists else ["General Physician"]
    
    def _generate_summary(self, symptoms: SymptomInput, diagnoses: List) -> str:
        top_diag = diagnoses[0]['label'] if diagnoses else "Unknown"
        confidence = diagnoses[0]['score'] if diagnoses else 0
        
        summary = f"Based on reported symptoms of {symptoms.symptoms_text} "
        summary += f"with {symptoms.severity}/10 severity over {symptoms.duration}, "
        summary += f"AI analysis suggests possible {top_diag} (confidence: {confidence:.0%}). "
        summary += "Awaiting doctor verification for final diagnosis."
        
        return summary

ai_service = AIHealthService()

#  UTILITY FUNCTIONS 
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
redis_client = redis.from_url(settings.REDIS_URL)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_token(user_id: int) -> str:
    expire = datetime.utcnow() + timedelta(days=settings.ACCESS_TOKEN_EXPIRE)
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def find_nearest_hospitals(lat: float, lon: float, specialty: str, db: Session) -> List[Dict]:
    """Find nearest hospitals with required specialty"""
    hospitals = db.query(Hospital).all()
    
    results = []
    for h in hospitals:
        if specialty.lower() in [s.lower() for s in h.specialties]:
            distance = geodesic((lat, lon), (h.latitude, h.longitude)).km
            results.append({
                "id": h.id,
                "name": h.name,
                "address": h.address,
                "distance_km": round(distance, 2),
                "contact": h.contact,
                "available_doctors": len([d for d in h.doctors if d.available])
            })
    
    return sorted(results, key=lambda x: x['distance_km'])[:5]

#  FASTAPI APP 
app = FastAPI(title="Kantan Care API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def monitor_requests(request, call_next):
    request_count.inc()
    response = await call_next(request)
    return response

#  AUTH ENDPOINTS 
@app.post("/api/auth/signup")
async def signup(user: UserCreate, db: Session = Depends(get_db)):
    """User registration with medical history"""
    
    # Check existing user
    if db.query(User).filter(User.email == user.email).first():
        raise HTTPException(400, "Email already registered")
    
    new_user = User(
        email=user.email,
        phone=user.phone,
        password_hash=hash_password(user.password),
        age=user.age,
        gender=user.gender,
        medical_history=user.medical_history,
        location_lat=user.location_lat,
        location_lon=user.location_lon
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    token = create_token(new_user.id)
    
    return {
        "user_id": new_user.id,
        "token": token,
        "message": "Registration successful"
    }

@app.post("/api/auth/login")
async def login(email: str, password: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == email).first()
    
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(401, "Invalid credentials")
    
    token = create_token(user.id)
    
    return {"token": token, "user_id": user.id}

#  CONSULTATION ENDPOINTS 
@app.post("/api/consultation/analyze", response_model=ConsultationResponse)
async def analyze_symptoms(
    user_id: int,
    symptoms: SymptomInput,
    db: Session = Depends(get_db)
):
    """AI-powered symptom analysis"""
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    
    # Run AI analysis
    analysis = ai_service.analyze_symptoms(symptoms, user.medical_history)
    
    # Create consultation record
    consultation = Consultation(
        user_id=user_id,
        symptoms_text=symptoms.symptoms_text,
        duration=symptoms.duration,
        severity=symptoms.severity,
        body_location=symptoms.body_location,
        associated_symptoms=symptoms.associated_symptoms,
        ai_summary=analysis['summary'],
        potential_diagnoses=analysis['diagnoses'],
        recommended_tests=analysis['tests'],
        recommended_specialists=analysis['specialists'],
        risk_flags=analysis['risk_flags']
    )
    
    db.add(consultation)
    db.commit()
    db.refresh(consultation)
    
    # Find nearest hospitals
    primary_specialist = analysis['specialists'][0] if analysis['specialists'] else "General"
    hospitals = find_nearest_hospitals(
        user.location_lat or 27.7172,
        user.location_lon or 85.3240,
        primary_specialist,
        db
    )
    
    return ConsultationResponse(
        id=consultation.id,
        ai_summary=analysis['summary'],
        potential_diagnoses=analysis['diagnoses'],
        recommended_tests=analysis['tests'],
        recommended_specialists=analysis['specialists'],
        risk_flags=analysis['risk_flags'],
        nearest_hospitals=hospitals
    )

#  DOCTOR ENDPOINTS 
@app.get("/api/doctor/queue")
async def get_doctor_queue(doctor_id: int, db: Session = Depends(get_db)):
    """Get doctor's pending consultations"""
    
    pending = db.query(Consultation).filter(
        Consultation.doctor_id == doctor_id,
        Consultation.doctor_verified == False
    ).order_by(Consultation.created_at).all()
    
    return [
        {
            "id": c.id,
            "patient_age": c.user.age,
            "patient_gender": c.user.gender,
            "symptoms": c.symptoms_text,
            "severity": c.severity,
            "ai_summary": c.ai_summary,
            "suggested_diagnoses": c.potential_diagnoses,
            "risk_flags": c.risk_flags,
            "created_at": c.created_at.isoformat()
        }
        for c in pending
    ]

@app.post("/api/doctor/verify/{consultation_id}")
async def verify_consultation(
    consultation_id: int,
    doctor_id: int,
    verified_tests: List[str],
    doctor_notes: str,
    recommended_action: str,
    db: Session = Depends(get_db)
):
    """Doctor verifies and updates AI recommendations"""
    
    consultation = db.query(Consultation).filter(Consultation.id == consultation_id).first()
    if not consultation:
        raise HTTPException(404, "Consultation not found")
    
    consultation.doctor_verified = True
    consultation.doctor_id = doctor_id
    consultation.doctor_notes = doctor_notes
    consultation.final_recommendations = {
        "tests": verified_tests,
        "action": recommended_action,
        "notes": doctor_notes
    }
    
    db.commit()
    
    return {"message": "Consultation verified", "consultation_id": consultation_id}

#  APPOINTMENT ENDPOINTS 
@app.post("/api/appointment/book")
async def book_appointment(
    user_id: int,
    hospital_id: int,
    doctor_id: int,
    consultation_id: int,
    preferred_time: datetime,
    db: Session = Depends(get_db)
):
    """Book appointment with queue management"""
    
    # Get current queue position
    existing_count = db.query(Appointment).filter(
        Appointment.doctor_id == doctor_id,
        Appointment.status == "scheduled",
        Appointment.scheduled_time >= datetime.utcnow()
    ).count()
    
    appointment = Appointment(
        user_id=user_id,
        doctor_id=doctor_id,
        hospital_id=hospital_id,
        consultation_id=consultation_id,
        scheduled_time=preferred_time,
        queue_position=existing_count + 1,
        estimated_wait=existing_count * 15  # 15 min per patient
    )
    
    db.add(appointment)
    db.commit()
    db.refresh(appointment)
    
    return {
        "appointment_id": appointment.id,
        "queue_position": appointment.queue_position,
        "estimated_wait_minutes": appointment.estimated_wait,
        "scheduled_time": appointment.scheduled_time.isoformat()
    }

#  MONITORING ENDPOINTS 
@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint"""
    return generate_latest()

@app.get("/health")
async def health_check():
    """Health check for load balancer"""
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)