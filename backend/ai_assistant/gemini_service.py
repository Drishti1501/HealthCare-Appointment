import os
import json
import re
import requests
from django.conf import settings
from .prompts import PRE_VISIT_PROMPT_TEMPLATE, POST_VISIT_PROMPT_TEMPLATE

def clean_json_text(raw_text):
    """Cleans markdown JSON code blocks from LLM response"""
    if not raw_text:
        return ""
    text = raw_text.strip()
    if text.startswith("```json"):
        text = text[7:]
    elif text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    return text.strip()


def call_gemini_api(prompt_text):
    """
    Calls Google Gemini API using REST endpoint.
    Handles timeouts, missing keys, and invalid responses gracefully.
    """
    api_key = getattr(settings, 'GEMINI_API_KEY', '') or os.environ.get('GEMINI_API_KEY', '')
    if not api_key:
        print("[Gemini Service]: No GEMINI_API_KEY configured. Using intelligent fallback.")
        return None

    # Supported model endpoints: gemini-1.5-flash or gemini-2.0-flash
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt_text}
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.2,
            "responseMimeType": "application/json"
        }
    }

    try:
        response = requests.post(url, json=payload, timeout=12)
        if response.status_code == 200:
            data = response.json()
            candidates = data.get('candidates', [])
            if candidates and 'content' in candidates[0]:
                parts = candidates[0]['content'].get('parts', [])
                if parts and 'text' in parts[0]:
                    return parts[0]['text']
        else:
            print(f"[Gemini Service Error {response.status_code}]: {response.text}")
    except Exception as e:
        print(f"[Gemini Service Exception]: {e}")
    return None


def generate_pre_visit_summary(symptoms_text):
    """
    Evaluates patient symptoms, calculates urgency level, chief complaint,
    and 3 suggested diagnostic questions for the doctor.
    """
    prompt = PRE_VISIT_PROMPT_TEMPLATE.format(symptoms=symptoms_text)
    raw_response = call_gemini_api(prompt)

    if raw_response:
        try:
            cleaned = clean_json_text(raw_response)
            parsed = json.loads(cleaned)
            urgency = parsed.get('urgency_level', 'Medium')
            if urgency not in ['Low', 'Medium', 'High']:
                urgency = 'Medium'
            return {
                'urgency_level': urgency,
                'chief_complaint': parsed.get('chief_complaint', symptoms_text[:150]),
                'suggested_questions': parsed.get('suggested_questions', [
                    "How long have you experienced these symptoms?",
                    "Are you currently taking any regular medications?",
                    "Have you noticed any triggers or worsening factors?"
                ]),
                'preliminary_notes': parsed.get('preliminary_notes', ''),
                'raw_response': raw_response,
                'source': 'GEMINI_LLM'
            }
        except Exception as e:
            print(f"[Pre-Visit JSON Parse Warning]: {e}")

    # Fallback heuristic engine (Graceful degradation)
    symptoms_lower = symptoms_text.lower()
    high_keywords = ['chest pain', 'shortness of breath', 'difficulty breathing', 'bleeding', 'unconscious', 'severe trauma', 'stroke', 'paralysis', 'heart attack', 'extreme pain']
    med_keywords = ['fever', 'vomiting', 'migraine', 'dizziness', 'fracture', 'rash', 'infection', 'persistent cough', 'hypertension', 'diabetes']

    if any(k in symptoms_lower for k in high_keywords):
        urgency = 'High'
    elif any(k in symptoms_lower for k in med_keywords):
        urgency = 'Medium'
    else:
        urgency = 'Low'

    return {
        'urgency_level': urgency,
        'chief_complaint': f"Patient reports: {symptoms_text[:180]}",
        'suggested_questions': [
            f"When did the onset of these symptoms first occur?",
            f"On a scale of 1-10, how does this affect your daily activities?",
            f"Do you have a personal or family history related to this condition?"
        ],
        'preliminary_notes': "Automated triage summary generated via rule-based fallback system.",
        'raw_response': "FALLBACK_HEURISTIC",
        'source': 'HEURISTIC_FALLBACK'
    }


def generate_post_visit_summary(clinical_notes, diagnosis, prescription_items_list, follow_up_date_str=''):
    """
    Converts clinical notes and prescription into patient-friendly instructions,
    structured medication schedule, and follow-up steps.
    """
    meds_str = ", ".join([
        f"{m.get('medication_name')} ({m.get('dosage')}, {m.get('frequency')}, {m.get('duration_days')} days - {m.get('instructions')})"
        for m in prescription_items_list
    ]) if prescription_items_list else "None prescribed"

    prompt = POST_VISIT_PROMPT_TEMPLATE.format(
        notes=clinical_notes,
        diagnosis=diagnosis or "Clinical consultation",
        medications=meds_str,
        follow_up_date=follow_up_date_str or "As needed"
    )

    raw_response = call_gemini_api(prompt)

    if raw_response:
        try:
            cleaned = clean_json_text(raw_response)
            parsed = json.loads(cleaned)
            return {
                'patient_friendly_summary': parsed.get('patient_friendly_summary', ''),
                'medication_schedule': parsed.get('medication_schedule', []),
                'follow_up_steps': parsed.get('follow_up_steps', []),
                'warning_signs': parsed.get('warning_signs', []),
                'raw_response': raw_response,
                'source': 'GEMINI_LLM'
            }
        except Exception as e:
            print(f"[Post-Visit JSON Parse Warning]: {e}")

    # Fallback generator
    med_schedule = []
    for m in prescription_items_list:
        med_schedule.append({
            'medication_name': m.get('medication_name', 'Medication'),
            'dosage': m.get('dosage', 'Standard dose'),
            'frequency': m.get('frequency', 'As directed'),
            'timing': f"{m.get('frequency', 'Daily')} ({m.get('instructions', 'Take with water')})",
            'special_instructions': m.get('instructions', 'Complete the full course.')
        })

    summary_text = (
        f"You were evaluated for {diagnosis or 'your symptoms'}. "
        f"Doctor's notes indicate: {clinical_notes}. "
        f"Please take your prescribed medicines on time and get adequate rest."
    )

    return {
        'patient_friendly_summary': summary_text,
        'medication_schedule': med_schedule,
        'follow_up_steps': [
            f"Follow the prescribed medication schedule diligently.",
            f"Rest and stay hydrated.",
            f"Return for a follow-up review on {follow_up_date_str or 'if symptoms persist'}."
        ],
        'warning_signs': [
            "Sudden difficulty breathing or severe dizziness",
            "High persistent fever unresponsive to medication",
            "Severe worsening of symptoms"
        ],
        'raw_response': "FALLBACK_HEURISTIC",
        'source': 'HEURISTIC_FALLBACK'
    }
