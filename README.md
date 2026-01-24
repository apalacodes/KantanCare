
# 🩺 KantanCare
Service Design & Deployment Capstone Project
**KantanCare** is an AI-powered healthcare assistant designed to make medical guidance **simple, accessible, and localized for Nepal**.

It helps users understand symptoms, get AI-generated medical summaries, find nearby doctors and hospitals, and manage their health records — all in one place.

---

## 🌟 Key Features

- **AI Symptom Analysis**
  - Uses **GPT-2.5** to generate structured medical summaries
  - Provides possible causes based on described symptoms
  - Suggests **potential diagnostic tests** and **at-home relief remedies**

- **Doctor & Hospital Matching**
  - Maps **specialists and nearby hospitals** based on:
    - Reported symptoms
    - Medical specialty relevance
    - User location
  - Supports localized Nepali healthcare data

- **Location-Aware Recommendations**
  - Finds medical facilities close to the user
  - Optimized for Nepali cities and districts

- **Appointments & Records**
  - Book appointments with doctors
  - Retrieve previous medical records
  - Track symptom history and consultations over time

- **Unified Health Dashboard**
  - Symptoms
  - AI summaries
  - Test recommendations
  - Medical history — all in one place

---

## Database

- Cloud-hosted using **Supabase**
- Contains:
  - Nepali hospitals and clinics
  - Doctor profiles and specialties
  - Location-based healthcare data
- Designed for fast querying and easy scaling

---

## AI & Intelligence

- Symptom understanding and summarization powered by **GPT-2.5**
- Converts user-reported symptoms into:
  - Medical summaries
  - Test suggestions
  - Home-care guidance
- Outputs are structured JSON for reliable frontend rendering

> ⚠️ KantanCare does **not replace professional medical advice**. It is designed to assist, not diagnose.

---

## 🛠 Tech Stack

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** FastAPI (Python)
- **Database:** Supabase (PostgreSQL)
- **AI:** OpenRouter (GPT-2.5)
- **APIs:** REST-based architecture
  
##  API Documentation

KantanCare uses a REST-based API built with FastAPI.

Interactive API documentation is available at:
- Swagger UI: `/docs`
- ReDoc: `/redoc`

Main endpoint:
- `POST /symptom-check` – Analyze symptoms and return AI-assisted medical guidance
---

## Getting Started

1. Clone the repository
   ```bash
   git clone https://github.com/apalacodes/KantanCare.git
## Access Points

- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
  
## Set up environment variables
OPENROUTER_API_KEY=your_key_here
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
