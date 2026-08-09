from dotenv import load_dotenv
load_dotenv()  # Loads .env from the same directory automatically

import sys
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

import os
import requests
import joblib
import numpy as np
import pandas as pd
import json
import re
import threading
from flask import Flask, request, jsonify
from flask_cors import CORS

# ==========================================
# GMAIL SMTP — Emergency Email Alert
# Uses Python built-in smtplib — no extra packages needed
# Uses your existing Gmail account — no new signup required
# ==========================================
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

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
# 2. GMAIL SMTP — Emergency Email Alert
# Uses your existing Gmail — no new service needed.
# Enable 2-Step Verification on Gmail, then generate an App Password:
# Google Account → Security → App passwords → generate one for 'Mail'
# ==========================================
GMAIL_SENDER   = os.environ.get("GMAIL_SENDER", "").strip()   # your Gmail address
GMAIL_APP_PASS = os.environ.get("GMAIL_APP_PASS", "").strip() # 16-char App Password (no spaces)
ALERT_EMAIL_TO = os.environ.get("ALERT_EMAIL_TO", "").strip() # where to send the alert (can be same Gmail)

def send_emergency_sos(patient_vitals: dict, location: dict, contact_number: str, alert_to: str = "") -> bool:
    """
    Sends an emergency email alert via Gmail SMTP.
    alert_to: the PER-USER emergency email set in their profile.
              Falls back to ALERT_EMAIL_TO from .env if not provided.
    Returns True if email was sent successfully, False otherwise.
    """
    recipient = alert_to.strip() or ALERT_EMAIL_TO  # 🔑 per-user first, then fallback
    if not all([GMAIL_SENDER, GMAIL_APP_PASS, recipient]):
        print(f"⚠️  No alert email configured for this user — skipping. (alert_to='{alert_to}')")
        return False

    lat  = location.get("lat", "unknown")
    lng  = location.get("lng", "unknown")
    maps_link = f"https://www.google.com/maps?q={lat},{lng}" if lat != "unknown" else "Location unavailable"

    subject = "MEDAI EMERGENCY ALERT - Patient HIGH RISK"
    html_body = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:#dc2626;padding:24px;border-radius:12px 12px 0 0;">
        <h1 style="color:white;margin:0;font-size:24px;">&#128680; MEDAI Emergency Alert</h1>
        <p style="color:#fecaca;margin:8px 0 0 0;">Patient vitals flagged as HIGH RISK</p>
      </div>
      <div style="background:#fff5f5;padding:24px;border:1px solid #fecaca;">
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:10px;font-weight:bold;">&#10084; Heart Rate</td>
              <td style="padding:10px;font-size:20px;font-weight:bold;color:#dc2626;">{patient_vitals.get('heart_rate','N/A')} BPM</td></tr>
          <tr style="background:#fff;"><td style="padding:10px;font-weight:bold;">&#128168; SpO2</td>
              <td style="padding:10px;font-size:20px;font-weight:bold;color:#dc2626;">{patient_vitals.get('spo2','N/A')}%</td></tr>
          <tr><td style="padding:10px;font-weight:bold;">&#129656; Blood Pressure</td>
              <td style="padding:10px;font-size:20px;font-weight:bold;color:#dc2626;">{patient_vitals.get('systolic_bp','N/A')}/{patient_vitals.get('diastolic_bp','N/A')} mmHg</td></tr>
          <tr style="background:#fff;"><td style="padding:10px;font-weight:bold;">&#128095; Steps</td>
              <td style="padding:10px;font-size:20px;font-weight:bold;">{patient_vitals.get('steps','N/A')}</td></tr>
          <tr><td style="padding:10px;font-weight:bold;">&#128222; Contact</td>
              <td style="padding:10px;">{contact_number}</td></tr>
        </table>
        <div style="margin-top:20px;padding:16px;background:white;border-radius:8px;border:1px solid #e5e7eb;">
          <p style="margin:0;"><strong>&#128205; Live Location:</strong><br/>
          <a href="{maps_link}" style="color:#2563eb;">Open in Google Maps</a></p>
        </div>
        <p style="margin-top:20px;font-size:14px;color:#6b7280;">This alert was sent automatically by the MEDAI AI Health Monitoring Platform.</p>
      </div>
    </div>
    """

    result = {"success": False}
    event  = threading.Event()

    def _dispatch():
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"]    = GMAIL_SENDER
            msg["To"]      = recipient
            msg.attach(MIMEText(html_body, "html"))

            with smtplib.SMTP("smtp.gmail.com", 587) as server:
                server.starttls()
                server.login(GMAIL_SENDER, GMAIL_APP_PASS)
                server.sendmail(GMAIL_SENDER, recipient, msg.as_string())

            print(f"✅ Emergency email sent to {recipient} via Gmail SMTP")
            result["success"] = True
        except Exception as e:
            print(f"❌ Gmail SMTP dispatch failed: {e}")
        finally:
            event.set()

    t = threading.Thread(target=_dispatch, daemon=True)
    t.start()
    event.wait(timeout=20)
    return result["success"]


@app.route("/test-sos", methods=["GET"])
def test_sos():
    """Test endpoint — visit http://localhost:5000/test-sos to send a test emergency email."""
    ok = send_emergency_sos(
        patient_vitals={"heart_rate": 110, "spo2": 88, "systolic_bp": 160, "diastolic_bp": 100, "steps": 200},
        location={"lat": 18.5204, "lng": 73.8567},
        contact_number="8177863563"
    )
    return jsonify({"success": ok, "message": "Check your email!" if ok else "Failed — check backend logs"})

# ==========================================
# 3. SETUP GEMINI
# ==========================================
# 👇 Reads from .env or environment.
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "").strip()


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

        # Get patient profile if provided
        profile = data.get("patient_profile")
        profile_str = ""
        if profile:
            profile_str = f"""
            Patient Health Profile:
            - Age: {profile.get('age', 'N/A')} years
            - Height: {profile.get('height', 'N/A')} cm
            - Weight: {profile.get('weight', 'N/A')} kg
            - BMI: {profile.get('bmi', 'N/A')}
            - Athlete Status: {"Athlete" if profile.get('athlete_status') else "Non-Athlete"}
            - Sport: {profile.get('sport_type', 'N/A')} (if Athlete)
            - Training Frequency: {profile.get('training_frequency', 'N/A')} (if Athlete)
            - Resting Heart Rate: {profile.get('resting_heart_rate', 'N/A')} BPM
            - Medical History: {", ".join(profile.get('medical_history', [])) if isinstance(profile.get('medical_history'), list) else profile.get('medical_history', 'None')}
            - Smoking: {"Yes" if profile.get('smoking') else "No"}
            - Alcohol: {"Yes" if profile.get('alcohol') else "No"}
            """
        else:
            profile_str = "Patient Health Profile: Not provided. Assume standard adult clinical baselines."

        # --- STEP 2: Deep Clinical Reasoning (BALANCED PATIENT-DOCTOR PROMPT WITH HEALTH PROFILE DETAILS) ---
        prompt = f"""
        Act as a Collaborative Medical AI Assistant communicating clearly to BOTH a reviewing doctor and the patient.
        
        Patient Vitals: 
        - Heart Rate: {data['heart_rate']} BPM
        - Blood Oxygen (SpO2): {data['spo2']}%
        - Blood Pressure (BP): {data['systolic_bp']}/{data['diastolic_bp']} mmHg
        - Activity (Steps): {data['steps']}
        Base ML Triage Flag: {local_risk}

        {profile_str}

        STRICT TONE GUIDELINES:
        - The tone must be professional, empathetic, and explanatory.
        - Explain WHAT the numbers mean in a way a patient understands, but maintain the clinical accuracy a doctor expects.
        - DO NOT use one-sentence answers. Provide a thorough 3-4 sentence paragraph for the 'simple_summary'.
        - You MUST clearly state in the summary that this is an AI-generated assessment.

        PERSONALIZATION RULES:
        - Carefully analyze the vitals in context of the Patient Health Profile.
        - Example 1 (Athlete): If the patient is an athlete with a low resting HR (e.g. 56 BPM) and their current HR is 112 BPM, explain: "The current heart rate is elevated compared to your resting value but falls within the expected range for an athlete after physical activity." and the risk should be evaluated as Low Risk (or matching the ML flag).
        - Example 2 (Non-Athlete): If the patient is a non-athlete with a resting HR of 80 BPM and their current HR is 112 BPM, explain: "Your heart rate is considerably above your normal resting rate. Combined with your profile, additional monitoring is recommended." and flag it accordingly.
        - Factor in medical history (e.g. Hypertension history means their normal BP baseline may be elevated; Asthma history means their normal SpO2 may have a lower threshold).
        - Factor in smoking and alcohol usage in the risk forecasting.

        YOU MUST RETURN ONLY VALID JSON MATCHING THIS EXACT STRUCTURE:
        {{
            "vitals_analysis": {{
                "hr_note": "Explain the heart rate clearly relative to their baseline.",
                "spo2_note": "Explain the oxygen level clearly relative to their baseline.",
                "bp_note": "Explain the blood pressure clearly relative to their baseline.",
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
            "hospital_recommendation": "Specific medical unit or 'Home Monitoring'",
            "personalized_insights": {{
                "ai_summary": "Concise risk summary (e.g., Low Risk, Moderate Risk, High Risk)",
                "prediction_confidence": "Prediction confidence percentage, e.g. 95%",
                "primary_risk_factors": ["Factor 1", "Factor 2"],
                "positive_indicators": ["Indicator 1", "Indicator 2"],
                "personalized_explanation": "A complete explanation of how current vitals align or conflict with their personal baseline (resting HR, BMI, etc.) and lifestyle (athlete, smoker, etc.).",
                "recommended_actions": ["Action 1", "Action 2"]
            }},
            "doctor_summary": {{
                "current_risk": "e.g. Low, Moderate, High",
                "heart_rate": "Status relative to baseline (e.g. Normal, Above personal baseline, Below personal baseline)",
                "blood_pressure": "Status relative to baseline (e.g. Normal, Elevated, High)",
                "spo2": "Status relative to baseline (e.g. Normal, Slightly Low, Critically Low)",
                "recommendation": "Concise medical recommendation for the physician."
            }}
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
                "hospital_recommendation": "General Clinic",
                "personalized_insights": {
                    "ai_summary": f"{local_risk} Risk",
                    "prediction_confidence": "85% (Fallback Model)",
                    "primary_risk_factors": ["Pending live AI calibration"],
                    "positive_indicators": ["Vitals transmission stable"],
                    "personalized_explanation": f"Patient classified as {local_risk} Risk. Please establish network connection for full health profile baseline analysis.",
                    "recommended_actions": ["Monitor vitals periodically"]
                },
                "doctor_summary": {
                    "current_risk": local_risk.capitalize(),
                    "heart_rate": "Pending AI baseline review",
                    "blood_pressure": "Pending AI baseline review",
                    "spo2": "Pending AI baseline review",
                    "recommendation": "Review vitals and history manually."
                }
            }

        # --- STEP 4: Emergency SOS — email goes to THIS USER's emergency contact ---
        sos_dispatched = False
        emergency_contact = data.get("emergency_contact", "").strip()
        emergency_email   = data.get("emergency_email",   "").strip()  # 🔑 per-user
        if local_risk == "HIGH" and emergency_contact:
            location = data.get("location", {})
            print(f"🚨 SOS triggered — contact: {emergency_contact} | email: {emergency_email or '(fallback .env)'}")
            sos_dispatched = send_emergency_sos(
                patient_vitals=data,
                location=location,
                contact_number=emergency_contact,
                alert_to=emergency_email   # 📧 dynamic per-user recipient
            )

        return jsonify({
            "success": True,
            "triage_result": local_risk, 
            "deep_analysis": ai_data,    
            "message": "Analysis Successful",
            "sos_dispatched": sos_dispatched
        })

    except Exception as e:
        print(f"❌ Server Error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

# ==========================================
# 4. DRUG-DRUG INTERACTION (DDI) CHECKER
#    Step 1: NIH RxNorm API  - resolves drug name to RxCUI (standard ID)
#    Step 2: OpenFDA API     - searches FDA drug labels for interaction text
#    Note: NIH /interaction/list endpoint was deprecated (returns 404).
#          OpenFDA is the current US government source for DDI label data.
# ==========================================
@app.route('/check_ddi', methods=['POST', 'OPTIONS'])
def check_ddi():
    """Check for drug-drug interactions via NIH RxNorm + OpenFDA.
    Request : { "medications": ["Aspirin", "Warfarin"] }
    Response: { "has_interaction": bool, "warnings": [str, ...] }
    """
    if request.method == 'OPTIONS':
        return jsonify({"status": "CORS approved"}), 200

    try:
        data = request.json
        med_names = data.get("medications", [])

        if len(med_names) < 2:
            return jsonify({"has_interaction": False, "warnings": []})

        # --- Step 1: Resolve each drug name to an RxCUI ---
        rxcuis = []
        for name in med_names:
            try:
                r = requests.get(
                    "https://rxnav.nlm.nih.gov/REST/rxcui.json",
                    params={"name": name},
                    timeout=8
                )
                if r.status_code == 200:
                    id_group = r.json().get("idGroup", {})
                    rxcui_list = id_group.get("rxnormId", [])
                    if rxcui_list:
                        rxcuis.append(rxcui_list[0])
                        print(f"   RxCUI for '{name}': {rxcui_list[0]}")
                    else:
                        print(f"   No RxCUI found for '{name}'")
            except requests.exceptions.RequestException as e:
                print(f"   RxNorm lookup failed for '{name}': {e}")

        if len(rxcuis) < 2:
            return jsonify({
                "has_interaction": False,
                "warnings": [],
                "info": "Could not resolve enough drug IDs from RxNorm to check interactions."
            })

        # --- Step 2: OpenFDA drug label search for interaction text ---
        # Searches official FDA prescribing labels where one drug mentions another.
        warnings = []
        for i, primary_name in enumerate(med_names):
            other_drugs = [med_names[j] for j in range(len(med_names)) if j != i]
            for other_name in other_drugs:
                try:
                    fda_r = requests.get(
                        "https://api.fda.gov/drug/label.json",
                        params={
                            "search": "openfda.generic_name:" + primary_name + " AND drug_interactions:" + other_name,
                            "limit": 3
                        },
                        timeout=10
                    )
                    if fda_r.status_code == 200:
                        fda_data = fda_r.json()
                        results = fda_data.get("results", [])
                        for res in results:
                            interaction_texts = res.get("drug_interactions", [])
                            for text in interaction_texts:
                                if other_name.lower() in text.lower():
                                    sentences = text.split(".")
                                    relevant = [s.strip() for s in sentences if other_name.lower() in s.lower()]
                                    if relevant:
                                        warning = primary_name + " + " + other_name + ": " + relevant[0][:250] + "."
                                        if warning not in warnings:
                                            warnings.append(warning)
                    elif fda_r.status_code != 404:
                        print("   OpenFDA returned", fda_r.status_code, "for", primary_name, "/", other_name)
                except requests.exceptions.RequestException as e:
                    print("   OpenFDA lookup failed for", primary_name, "vs", other_name, ":", e)

        # --- Step 3: Broader cross-check if targeted search found nothing ---
        if not warnings:
            try:
                broad_r = requests.get(
                    "https://api.fda.gov/drug/label.json",
                    params={"search": "drug_interactions:" + med_names[0], "limit": 5},
                    timeout=10
                )
                if broad_r.status_code == 200:
                    for res in broad_r.json().get("results", []):
                        for text in res.get("drug_interactions", []):
                            for other in med_names[1:]:
                                if other.lower() in text.lower():
                                    sentences = text.split(".")
                                    relevant = [s.strip() for s in sentences if other.lower() in s.lower()]
                                    if relevant:
                                        warning = med_names[0] + " + " + other + ": " + relevant[0][:250] + "."
                                        if warning not in warnings:
                                            warnings.append(warning)
            except Exception as e:
                print("   Broad DDI search failed:", e)

        has_interaction = len(warnings) > 0
        print("   DDI Result:", len(warnings), "interaction(s) found. RxCUIs:", rxcuis)

        return jsonify({
            "has_interaction": has_interaction,
            "warnings": warnings
        })

    except Exception as e:
        print("DDI Route Error:", e)
        return jsonify({
            "has_interaction": False,
            "warnings": [],
            "error": str(e)
        }), 200  # Return 200 so frontend handles gracefully


# ==========================================
# 5. VOICE CHATBOT ROUTE (CORS BULLETPROOFED)
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
# 4. PILL RECOGNITION (VISION) ROUTE
# ==========================================
@app.route('/recognize_pill', methods=['POST', 'OPTIONS'])
def recognize_pill():
    if request.method == 'OPTIONS':
        return jsonify({"status": "CORS approved"}), 200

    try:
        data = request.json
        image_base64 = data.get('image', '')
        
        if not image_base64:
            return jsonify({"success": False, "error": "No image provided"}), 400

        # Remove the data:image/jpeg;base64, prefix if present
        if ',' in image_base64:
            image_base64 = image_base64.split(',', 1)[1]

        prompt = """
        You are a medical AI assistant. Analyze this image of a pill or prescription box.
        Extract the medication details and return ONLY a valid JSON object matching this structure:
        {
            "name": "Name of the medicine",
            "dosage": "e.g., 500mg",
            "frequency": "e.g., 1 pill daily or twice a day based on typical prescription or visible text. Default to '1 pill daily' if unknown."
        }
        Return ONLY valid JSON.
        """
        
        payload = {
            "contents": [{
                "parts": [
                    {"text": prompt},
                    {"inlineData": {"mimeType": "image/jpeg", "data": image_base64}}
                ]
            }],
            "generationConfig": {"response_mime_type": "application/json"}
        }

        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"
        headers = {"Content-Type": "application/json"}
        
        response = requests.post(url, headers=headers, json=payload, timeout=20)
        
        if response.status_code == 200:
            ai_text = response.json()['candidates'][0]['content']['parts'][0]['text']
            
            # Clean up potential markdown formatting
            clean_text = ai_text.strip()
            if clean_text.startswith("```json"):
                clean_text = clean_text[7:]
            if clean_text.startswith("```"):
                clean_text = clean_text[3:]
            if clean_text.endswith("```"):
                clean_text = clean_text[:-3]
            clean_text = clean_text.strip()
            
            parsed_data = json.loads(clean_text)
            return jsonify({"success": True, "data": parsed_data})
        else:
            print(f"Vision API Error: {response.text}")
            return jsonify({"success": False, "error": "Failed to analyze image"}), 500

    except Exception as e:
        print(f"❌ Pill Recognition Error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

# ==========================================
# 7. PILL RECOGNITION (VISION) ROUTE — unchanged
# (route code above, section header renumbered)
# ==========================================

# ==========================================
# 9. AI DIET EXPLANATION PROXY ROUTE
# ==========================================
@app.route('/diet_explain', methods=['POST', 'OPTIONS'])
def diet_explain():
    if request.method == 'OPTIONS':
        return jsonify({"status": "CORS approved"}), 200

    try:
        data = request.json
        diet_plan = data.get('diet_plan', {})
        patient_profile = data.get('patient_profile', {})
        vitals = data.get('vitals', {})
        user_inputs = data.get('user_inputs', {})

        # Extract values for easier prompt generation
        age = patient_profile.get('age', 'N/A')
        height = patient_profile.get('height', 'N/A')
        weight = patient_profile.get('weight', 'N/A')
        bmi = patient_profile.get('bmi', 'N/A')
        athlete_status = "Athlete" if patient_profile.get('athlete_status') else "Non-Athlete"
        sport = patient_profile.get('sport_type', 'N/A')
        training = patient_profile.get('training_frequency', 'N/A')
        
        # Format history string
        hist_list = patient_profile.get('medical_history', [])
        if isinstance(hist_list, list):
            history = ", ".join(hist_list)
        else:
            history = str(hist_list)
        if not history.strip():
            history = "None"
        
        systolic = vitals.get('systolic_bp', 'N/A')
        diastolic = vitals.get('diastolic_bp', 'N/A')
        hr = vitals.get('heart_rate', 'N/A')
        steps = vitals.get('steps', 'N/A')

        preference = user_inputs.get('preference', 'Vegetarian')
        allergies = user_inputs.get('allergies', 'None')
        goal = user_inputs.get('goal', 'Maintain Weight')
        budget = user_inputs.get('budget', 'Medium')

        calories = diet_plan.get('calories', 'N/A')
        protein = diet_plan.get('protein', 'N/A')
        carbs = diet_plan.get('carbohydrates', 'N/A')
        fat = diet_plan.get('fat', 'N/A')
        water = diet_plan.get('water', 'N/A')
        meals = diet_plan.get('meals', {})

        breakfast = meals.get('breakfast', 'N/A')
        morning_snack = meals.get('morning_snack', 'N/A')
        lunch = meals.get('lunch', 'N/A')
        evening_snack = meals.get('evening_snack', 'N/A')
        dinner = meals.get('dinner', 'N/A')
        
        rules_matched = ", ".join([f"{r.get('rule')} ({r.get('source')})" for r in diet_plan.get('rules_matched', [])])

        prompt = f"""You are MedAI, an expert clinical nutritionist assistant.
Your task is to review a pre-calculated, deterministic diet plan generated for a patient and provide a warm, encouraging, and clinically-justified explanation.

CRITICAL RULES:
1. DO NOT change the diet plan.
2. DO NOT change the calorie, protein, carbohydrate, fat, or water targets.
3. DO NOT alter the recommended meals (Breakfast, Snacks, Lunch, Dinner).
4. Explain WHY this specific diet was generated by our Clinical Decision Support System. Explicitly reference the clinical guidelines matched (e.g., DASH/AHA for blood pressure, ADA for diabetes, ISSN for athletes, WHO for BMI).
5. Personalize your explanation so it feels relevant to their age ({age}), goal ({goal}), medical history ({history}), activity level ({steps} steps), and athlete status ({athlete_status}).
6. Format your response ONLY as a valid JSON object matching this structure:
{{
    "explanation": "Write a 3-4 sentence paragraph that warmly explains why this clinical plan was selected, what guidelines (WHO, AHA, NHLBI, ADA, ACSM, ISSN, ICMR-NIN) it follows, and how it will help them reach their goal. Use markdown in this string for bolding/emphasis if desired.",
    "personalized_tips": [
        "A tip about hydration or meal timing aligned with their active hours or steps.",
        "A tip specific to their goal ({goal}) or preference ({preference}).",
        "A specific advisory tip for their allergies ({allergies}) or medical history ({history})."
    ]
}}
Ensure the output is valid JSON. Return ONLY JSON.

Patient Context:
- Profile: Age {age}, Height {height}cm, Weight {weight}kg, BMI {bmi}, {athlete_status} (Sport: {sport}, Training: {training}), History: {history}
- Vitals: BP {systolic}/{diastolic} mmHg, HR {hr} BPM, Steps {steps}
- Preferences: Preference: {preference}, Allergies: {allergies}, Goal: {goal}, Budget: {budget}
- Matched Clinical Rules: {rules_matched}

Pre-Calculated Diet Plan:
- Calories: {calories} kcal | Protein: {protein}g | Carbs: {carbs}g | Fat: {fat}g | Water: {water}L
- Breakfast: {breakfast}
- Morning Snack: {morning_snack}
- Lunch: {lunch}
- Evening Snack: {evening_snack}
- Dinner: {dinner}
"""

        # Call Gemini using model cascade
        ai_response = ask_gemini_advanced(prompt)
        if ai_response:
            clean_text = ai_response.strip()
            if clean_text.startswith("```json"):
                clean_text = clean_text[7:]
            if clean_text.startswith("```"):
                clean_text = clean_text[3:]
            if clean_text.endswith("```"):
                clean_text = clean_text[:-3]
            clean_text = clean_text.strip()

            start_idx = clean_text.find('{')
            end_idx = clean_text.rfind('}') + 1
            if start_idx != -1 and end_idx != -1:
                clean_text = clean_text[start_idx:end_idx]

            parsed_data = json.loads(clean_text)
            return jsonify({"success": True, "data": parsed_data})
        else:
            return jsonify({"success": False, "error": "Gemini generation failed"}), 500

    except Exception as e:
        print(f"❌ Diet Explanation API Error: {e}")
        return jsonify({"success": False, "error": str(e)}), 200

# ==========================================
# 8. START SERVER (MUST BE AT THE VERY BOTTOM)
# ==========================================
if __name__ == "__main__":
    app.run(debug=True, port=5000)
