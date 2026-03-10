import requests
import joblib
import numpy as np
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
# 👇 PASTE YOUR KEY HERE
GEMINI_API_KEY = "AIzaSyDsIcSIER8S5knT8-z7c8TOT1tOEGd7ZrA"

def ask_gemini_advanced(prompt):
    models_to_try = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-pro"]
    
    headers = {"Content-Type": "application/json"}
    payload = { "contents": [{"parts": [{"text": prompt}]}] }

    print("   🌐 Contacting Google Gemini...")

    for model_name in models_to_try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={GEMINI_API_KEY}"
        try:
            response = requests.post(url, headers=headers, json=payload)
            if response.status_code == 200:
                print(f"   ✅ Success with model: {model_name}")
                return response.json()['candidates'][0]['content']['parts'][0]['text']
            else:
                print(f"   ⚠️ {model_name} failed ({response.status_code})")
        except:
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
        features = [
            float(data['heart_rate']),
            float(data['spo2']),
            float(data['systolic_bp']),
            float(data['diastolic_bp']),
            float(data['steps'])
        ]
        
        local_risk = "UNKNOWN"
        if model:
            pred = model.predict([np.array(features)])[0]
            local_risk = risk_mapping[pred]

        # --- STEP 2: Deep Clinical Reasoning (STRICT AI GENERATION) ---
        prompt = f"""
        Act as a Senior Medical Emergency Dispatcher.
        Patient Vitals: 
        - Heart Rate: {data['heart_rate']}
        - SpO2: {data['spo2']}
        - BP: {data['systolic_bp']}/{data['diastolic_bp']}
        - Steps: {data['steps']}
        ML Risk Flag: {local_risk}.

        STRICT INSTRUCTION: 
        1. Do NOT output generic labels. 
        2. For the 'vitals_analysis' section, you MUST write a full, specific medical sentence for EACH vital sign analyzing its condition. 
        3. Do not just repeat the numbers. Explain the IMPLICATION (e.g., "Hypoxia", "Hypertension", "Bradycardia").

        Output JSON format ONLY:
        {{
            "vitals_analysis": {{
                "hr_note": "Full sentence analyzing Heart Rate.",
                "spo2_note": "Full sentence analyzing SpO2.",
                "bp_note": "Full sentence analyzing BP.",
                "steps_note": "Full sentence analyzing activity level."
            }},
            "simple_summary": "One clear sentence explaining the patient's overall status.",
            "key_factors": ["Specific Reason 1", "Specific Reason 2", "Specific Reason 3"],
            "risk_forecast": "What exactly might happen in 4 hours?",
            "action_plan": ["Specific Step 1", "Specific Step 2", "Specific Step 3"],
            "hospital_recommendation": "Specific facility type (or 'None')"
        }}
        """

        raw_ai_response = ask_gemini_advanced(prompt)
        
        # Default Fallback (Only used if AI crashes completely)
        ai_data = None 

        if raw_ai_response:
            # 🧹 ROBUST JSON CLEANER
            clean_text = raw_ai_response.replace("```json", "").replace("```", "").strip()
            
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
                    print("   ⚠️ JSON parsed but missing keys.")
            except json.JSONDecodeError as je:
                print(f"   ❌ JSON Decode Error: {je}")

        if not ai_data:
             ai_data = {
                "vitals_analysis": {}, # Empty object to trigger "Unavailable" in frontend
                "simple_summary": "AI Service Unavailable.",
                "key_factors": ["Manual Review Required"],
                "risk_forecast": "Monitor Vitals",
                "action_plan": ["Consult Doctor"],
                "hospital_recommendation": "Nearest Emergency Room"
            }

        return jsonify({
            "success": True,
            "triage_result": local_risk, 
            "deep_analysis": ai_data,    
            "message": "Analysis Successful"
        })

    except Exception as e:
        print(f"❌ Error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True, port=5000)