
from openai import OpenAI
from pydantic import BaseModel
from typing import List, Optional
client = OpenAI(
  base_url="https://openrouter.ai/api/v1",
  api_key="KEY")

# ---------------------------
# Define structured schema
# ---------------------------
# class MedicalSummary(BaseModel):
#     patient_name: str | None = None
#     diagnosis: str | None = None
#     summary: str


class SymptomData(BaseModel):
    description: str
    duration: Optional[str] = None
    severity: Optional[int] = None
    bodyParts: Optional[List[str]] = []
    context: Optional[List[str]] = []
data = SymptomData(
    description="headache and nausea",
    duration="2 days",
    severity=5,
    bodyParts=["head", "stomach"],
    context=["office stress"]
)


# ---------------------------
# Prompt
# ---------------------------
myprompt = """ You are a medical diagnostic assistant.
Patient reports the following.
- Symptom Description: {data.description}
- Duration: {data.duration}
- Severity (1-10): {data.severity} 
- Body Location: {', '.join(data.bodyParts) if data.bodyParts else 'N/A'}
- Additional Context: {', '.join(data.context) if data.context else 'N/A'}

 Please provide a comprehensive analysis-upto 3 tests and remedies each in JSON format with the following structure:

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
        {"role": "user", "content": myprompt}
    ],
    max_tokens=1000,
    stream=False  # change to True if you want streaming
)

# ---------------------------
# Extract output
# ---------------------------
output_text = completion.choices[0].message.content
print("Raw LLM Output:\n", output_text)


