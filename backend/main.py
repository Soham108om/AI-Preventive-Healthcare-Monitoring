import os
import requests
import joblib
import numpy as np
import pandas as pd
import json
import re
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# ==========================================
# 1. SETUP LOCAL MODEL
# ==========================================
print("📂 Loading Local AI Model...")
try:
    model = joblib.load("risk_model.pkl")
    print("✅ Local Random Forest Model Loaded!")
except Exception as e:
    print(f"❌ Error loading local model: {e}")
    model = None

risk_mapping = {0: "HIGH", 1: "LOW", 2: "MODERATE"}

# ==========================================
# 2. SETUP GEMINI
# ==========================================
# 👇 Reads from .env or environment. Hardcoded key is a local dev fallback.
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", " ")

def ask_gemini_advanced(prompt):
    # Tests the most reliable active API endpoints in order
    models_to_try = [
        "gemini-2.5-flash",
        "gemini-2.0-flash", 
        "gemini-1.5-flash-latest" 
    ]
    
    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        # 🛡️ FORCES THE AI TO ONLY SPEAK IN VALID JSON
        "generationConfig": {"response_mime_type": "application/json"}
    }

    print("   🌐 Contacting Google Gemini...")

    for model_name in models_to_try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={GEMINI_API_KEY}"
        try:
            response = requests.post(url, headers=headers, json=payload, timeout=15)
            if response.status_code == 200:
                print(f"   ✅ Success with model: {model_name}")
                return response.json()['candidates'][0]['content']['parts'][0]['text']
            else:
                print(f"   ⚠️ {model_name} failed ({response.status_code}): {response.text}")
        except Exception as e:
            print(f"   ❌ Network error with {model_name}: {e}")
            continue

    return None

@app.route('/', methods=['GET'])
def home():
    return jsonify({"message": "Deep Medical AI Server is Running!"})

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.json
        print(f"\n🔍 Deep Analysis for Patient: {data}")

        # --- STEP 1: Local Prediction ---
        local_risk = "UNKNOWN"
        if model:
            # Converts to DataFrame to match training format and silence warnings
            features_df = pd.DataFrame([{
                'heart_rate': float(data['heart_rate']),
                'spo2': float(data['spo2']),
                'systolic_bp': float(data['systolic_bp']),
                'diastolic_bp': float(data['diastolic_bp']),
                'steps': float(data['steps'])
            }])
            
            pred = model.predict(features_df)[0]
            local_risk = risk_mapping[pred]

        # --- STEP 2: Deep Clinical Reasoning (BALANCED PATIENT-DOCTOR PROMPT) ---
        prompt = f"""
        Act as a Collaborative Medical AI Assistant communicating clearly to BOTH a reviewing doctor and the patient.
        
        Patient Vitals: 
        - Heart Rate: {data['heart_rate']} BPM
        - Blood Oxygen (SpO2): {data['spo2']}%
        - Blood Pressure (BP): {data['systolic_bp']}/{data['diastolic_bp']} mmHg
        - Activity (Steps): {data['steps']}
        Base ML Triage Flag: {local_risk}

        STRICT TONE GUIDELINES:
        - The tone must be professional, empathetic, and explanatory.
        - Explain WHAT the numbers mean in a way a patient understands, but maintain the clinical accuracy a doctor expects.
        - DO NOT use one-sentence answers. Provide a thorough 3-4 sentence paragraph for the 'simple_summary'.
        - You MUST clearly state in the summary that this is an AI-generated assessment.

        YOU MUST RETURN ONLY VALID JSON MATCHING THIS EXACT STRUCTURE:
        {{
            "vitals_analysis": {{
                "hr_note": "Explain the heart rate clearly.",
                "spo2_note": "Explain the oxygen level clearly.",
                "bp_note": "Explain the blood pressure clearly.",
                "steps_note": "Explain the activity level clearly."
            }},
            "simple_summary": "A detailed 3-4 sentence paragraph explaining the overall health status...",
            "key_factors": [
                "Clear observation 1", 
                "Clear observation 2", 
                "Clear observation 3"
            ],
            "risk_forecast": "What the patient/doctor should watch out for over the next 12-24 hours.",
            "action_plan": [
                "Actionable step 1", 
                "Actionable step 2", 
                "Actionable step 3"
            ],
            "hospital_recommendation": "Specific medical unit or 'Home Monitoring'"
        }}
        """

        raw_ai_response = ask_gemini_advanced(prompt)
        ai_data = None 

        if raw_ai_response:
            # 🧹 Advanced JSON Cleaner
            clean_text = raw_ai_response.strip()
            if clean_text.startswith("```json"):
                clean_text = clean_text[7:]
            if clean_text.startswith("```"):
                clean_text = clean_text[3:]
            if clean_text.endswith("```"):
                clean_text = clean_text[:-3]
            clean_text = clean_text.strip()
            
            try:
                start_idx = clean_text.find('{')
                end_idx = clean_text.rfind('}') + 1
                if start_idx != -1 and end_idx != -1:
                    clean_text = clean_text[start_idx:end_idx]
                
                parsed_data = json.loads(clean_text)
                
                if "vitals_analysis" in parsed_data:
                    ai_data = parsed_data
                    print("   ✅ Analysis Parsed Successfully!")
                else:
                    print("   ⚠️ JSON parsed but missing expected keys.")
            except json.JSONDecodeError as je:
                print(f"   ❌ JSON Decode Error: {je}")

        # --- STEP 3: Smart Fallback ---
        if not ai_data:
             ai_data = {
                "vitals_analysis": {
                    "hr_note": f"Heart Rate recorded at {data['heart_rate']} BPM.",
                    "spo2_note": f"SpO2 recorded at {data['spo2']}%.",
                    "bp_note": f"Blood Pressure recorded at {data['systolic_bp']}/{data['diastolic_bp']}.",
                    "steps_note": f"Activity recorded at {data['steps']} steps."
                },
                "simple_summary": f"Vitals processed. Machine Learning classified risk as {local_risk}. Cloud AI deep analysis is temporarily offline.",
                "key_factors": ["Vitals captured", f"ML Risk: {local_risk}", "Pending Physician Review"],
                "risk_forecast": "Monitor vitals for any sudden changes.",
                "action_plan": ["Review vitals manually", "Ensure patient stability"],
                "hospital_recommendation": "General Clinic"
            }

        return jsonify({
            "success": True,
            "triage_result": local_risk, 
            "deep_analysis": ai_data,    
            "message": "Analysis Successful"
        })

    except Exception as e:
        print(f"❌ Server Error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

# ==========================================
# 3. VOICE CHATBOT ROUTE (CORS BULLETPROOFED)
# ==========================================
# Localized fallback strings reused across all error branches
CHAT_FALLBACKS = {
    "en": "I am experiencing network issues. Please rely on the Live Triage dashboard.",
    "hi": "मुझे नेटवर्क की समस्या हो रही है। कृपया लाइव ट्राइएज डैशबोर्ड देखें।",
    "mr": "मला नेटवर्क समस्या येत आहे. कृपया लाइव्ह ट्राइएज डॅशबोर्ड तपासा."
}

CHAT_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash-latest"]

@app.route('/chat', methods=['POST', 'OPTIONS'])
def chat():
    # ✅ Instantly approve the browser's CORS preflight check
    if request.method == 'OPTIONS':
        return jsonify({"status": "CORS approved"}), 200

    try:
        data = request.json
        user_msg = data.get('message', '')
        lang = data.get('language', 'en')

        # 🩺 Extract live vitals from the request (sent by PatientDashboard)
        vitals = data.get('vitals', None)

        # Build the Live Patient Dossier block (only when vitals are present)
        if vitals:
            hr  = vitals.get('heart_rate', 'N/A')
            spo2 = vitals.get('spo2', 'N/A')
            sys_bp = vitals.get('systolic_bp', 'N/A')
            dia_bp = vitals.get('diastolic_bp', 'N/A')
            steps = vitals.get('steps', 'N/A')
            vitals_block = f"""--- LIVE PATIENT DOSSIER (confidential, do not repeat verbatim) ---
Heart Rate   : {hr} BPM
SpO2         : {spo2}%
Blood Pressure: {sys_bp}/{dia_bp} mmHg
Steps Today  : {steps}

EMERGENCY TRIGGERS — if ANY of these are true, your FIRST sentence must tell the patient to open the Emergency Map immediately and name the nearest hospital (e.g., Noble Hospital, Ruby Hall Clinic):
- Heart Rate > 130 or < 40 BPM
- SpO2 < 90%
- Systolic BP > 180 or < 80 mmHg
---"""
        else:
            vitals_block = "(No live vitals available for this session.)"

        # 🤖 Final prompt — patient dossier injected before the user's question
        prompt = f"""You are MedAI, a high-class clinical voice assistant. Follow these rules strictly:

PERSONA RULES:
1. EMPATHY FIRST — Your opening sentence must always warmly acknowledge the user's discomfort before anything else.
2. ZERO MEDICATIONS — You are absolutely forbidden from naming, suggesting, or implying any medication whatsoever — including paracetamol, ibuprofen, aspirin, antihistamines, cough syrups, or any OTC drug. Violation of this rule is not permitted under any circumstance.
3. SAFE COMFORT ONLY — Offer only 1 or 2 non-medical comfort measures relevant to the symptom (e.g., hydration, rest, cold compress, steam inhalation, deep breathing, warm compress, elevation). Never suggest a clinical procedure.
4. SMART ROUTING — If symptoms are mild, tell the user to rest and monitor. If symptoms are severe (chest pain, extreme fever, difficulty breathing, loss of consciousness, severe bleeding) OR if the live vitals dossier shows an emergency trigger, instruct the user to open the Emergency Map on their dashboard to find the nearest hospital — mention Ruby Hall Clinic or Noble Hospital by name.
5. CONCISE — Your entire response must be 3 sentences or fewer so it is natural to listen to via Text-to-Speech.
6. LANGUAGE ENFORCEMENT — Detect the incoming lang variable ("{lang}"). 
   - If lang is "hi", you MUST output the entire response in native Hindi (Devanagari script). 
   - If lang is "mr", you MUST output the entire response in native Marathi (Devanagari script). 
   - Under NO circumstances should you use Latin characters (Hinglish/Marathenglish) or include an English translation. This is critical for the browser's Text-to-Speech engine.
   - Do NOT use bullet points, markdown, or numbered lists — plain flowing prose only.

{vitals_block}

User query: {user_msg}"""


        payload = {"contents": [{"parts": [{"text": prompt}]}]}
        headers = {"Content-Type": "application/json"}

        # 🔄 Model fallback cascade — tries each model before giving up
        for model_name in CHAT_MODELS:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={GEMINI_API_KEY}"
            try:
                response = requests.post(url, headers=headers, json=payload, timeout=10)

                if response.status_code == 200:
                    ai_text = response.json()['candidates'][0]['content']['parts'][0]['text']
                    print(f"   ✅ Chat answered by: {model_name}")
                    return jsonify({"chat_response": ai_text.strip()})

                # 🛑 Rate limit or bad key — no point trying further, return fallback immediately
                if response.status_code in (429, 403):
                    print(f"   ⚠️ Chat quota/key error ({response.status_code}) on {model_name}. Returning fallback.")
                    return jsonify({"chat_response": CHAT_FALLBACKS.get(lang, CHAT_FALLBACKS["en"])})

                print(f"   ⚠️ {model_name} returned {response.status_code}. Trying next model...")

            except requests.exceptions.Timeout:
                print(f"   ⏱️ Timeout on {model_name}. Trying next model...")
                continue
            except Exception as e:
                print(f"   ❌ Network error on {model_name}: {e}. Trying next model...")
                continue

        # All models exhausted → localized fallback
        print("   ❌ All chat models failed. Returning localized fallback.")
        return jsonify({"chat_response": CHAT_FALLBACKS.get(lang, CHAT_FALLBACKS["en"])})

    except Exception as e:
        print(f"❌ Chat Route Error: {e}")
        return jsonify({"chat_response": CHAT_FALLBACKS.get("en")}), 200

# ==========================================
# 4. START SERVER (MUST BE AT THE VERY BOTTOM)
# ==========================================
if __name__ == "__main__":
    app.run(debug=True, port=5000)