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
# 👇 PASTE YOUR NEW API KEY HERE
GEMINI_API_KEY = "AIzaSyBsckop5gIJ9P8breDqJGMdqso4cwqDnrw"

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
                "hr_note": "Explain the heart rate clearly (e.g., 'Heart rate is 73 BPM, which is a healthy resting rate indicating good cardiovascular stability.').",
                "spo2_note": "Explain the oxygen level clearly.",
                "bp_note": "Explain the blood pressure clearly.",
                "steps_note": "Explain the activity level clearly."
            }},
            "simple_summary": "A detailed 3-4 sentence paragraph explaining the overall health status, what these vitals mean combined, and ending with 'Please note: This is an AI-generated assessment and should be verified by your physician.'",
            "key_factors": [
                "Clear observation 1", 
                "Clear observation 2", 
                "Clear observation 3"
            ],
            "risk_forecast": "What the patient/doctor should watch out for over the next 12-24 hours.",
            "action_plan": [
                "Actionable, easy-to-understand lifestyle or medical step 1", 
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
                "simple_summary": f"Vitals processed. Machine Learning classified risk as {local_risk}. Cloud AI deep analysis is temporarily offline. Please note: This is an AI-generated assessment and should be verified by your physician.",
                "key_factors": ["Vitals captured", f"ML Risk: {local_risk}", "Pending Physician Review"],
                "risk_forecast": "Monitor vitals for any sudden changes.",
                "action_plan": ["Review vitals manually", "Ensure patient stability", "Consult a physician if symptomatic"],
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

if __name__ == "__main__":
    app.run(debug=True, port=5000)