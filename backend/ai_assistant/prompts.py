PRE_VISIT_PROMPT_TEMPLATE = """You are an expert clinical triage assistant.
Analyse these symptoms and return: urgency level (Low / Medium / High), chief complaint, and three suggested questions for the doctor. Symptoms: {symptoms}

Respond STRICTLY in valid JSON format matching this schema:
{{
  "urgency_level": "Low" | "Medium" | "High",
  "chief_complaint": "Clear, concise 1-2 sentence clinical summary of the patient's primary symptoms",
  "suggested_questions": [
    "Targeted clinical question 1 for the doctor to ask",
    "Targeted clinical question 2 for the doctor to ask",
    "Targeted clinical question 3 for the doctor to ask"
  ],
  "preliminary_notes": "Brief context for the doctor"
}}
"""

POST_VISIT_PROMPT_TEMPLATE = """You are a compassionate, clear medical communication specialist.
Convert these clinical notes into a patient-friendly summary with medication schedule and follow-up steps: {notes}

Clinical Diagnosis: {diagnosis}
Prescribed Medications: {medications}
Follow-up Timeline: {follow_up_date}

Respond STRICTLY in valid JSON format matching this schema:
{{
  "patient_friendly_summary": "Empathetic, jargon-free explanation of what the doctor diagnosed and how the treatment helps",
  "medication_schedule": [
    {{
      "medication_name": "Name",
      "dosage": "e.g. 500mg",
      "frequency": "e.g. Twice Daily",
      "timing": "Morning and Evening after food",
      "special_instructions": "Take with plenty of water"
    }}
  ],
  "follow_up_steps": [
    "Step 1 (e.g. Schedule blood test in 5 days)",
    "Step 2 (e.g. Return for review on follow-up date)"
  ],
  "warning_signs": [
    "Red flag symptom 1 requiring immediate attention",
    "Red flag symptom 2"
  ]
}}
"""
