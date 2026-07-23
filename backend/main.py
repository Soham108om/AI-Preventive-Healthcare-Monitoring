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
# 👇 Reads from .env or environment. Hardcoded key is a local dev fallback.
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "AIzaSyCLj1XuF_AEXdKYUvGMv2JEWFR_ngBQniw ").strip()

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
# 4. DRUG-DRUG INTERACTION (DDI) CHECKER — NIH RxNorm API
# ==========================================
@app.route('/check_ddi', methods=['POST', 'OPTIONS'])
def check_ddi():
    """Check for drug-drug interactions using the NIH RxNorm API.
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
                        print(f"   ✅ RxCUI for '{name}': {rxcui_list[0]}")
                    else:
                        print(f"   ⚠️  No RxCUI found for '{name}'")
            except requests.exceptions.RequestException as e:
                print(f"   ❌ RxNorm lookup failed for '{name}': {e}")

        if len(rxcuis) < 2:
            # Not enough CUIs resolved — cannot check interactions
            return jsonify({
                "has_interaction": False,
                "warnings": [],
                "info": "Could not resolve enough drug IDs from RxNorm to check interactions."
            })

        # --- Step 2: Query the interaction list endpoint ---
        rxcui_param = "+".join(rxcuis)
        try:
            inter_r = requests.get(
                "https://rxnav.nlm.nih.gov/REST/interaction/list.json",
                params={"rxcuis": rxcui_param},
                timeout=10
            )
        except requests.exceptions.RequestException as e:
            print(f"   ❌ RxNorm interaction API unreachable: {e}")
            return jsonify({
                "has_interaction": False,
                "warnings": [],
                "error": "RxNorm Interaction API unavailable. Unable to verify interactions."
            })

        warnings = []
        if inter_r.status_code == 200:
            full_data = inter_r.json()
            groups = full_data.get("fullInteractionTypeGroup", [])
            for group in groups:
                for itype in group.get("fullInteractionType", []):
                    for pair in itype.get("interactionPair", []):
                        desc = pair.get("description", "")
                        if desc:
                            warnings.append(desc)

        has_interaction = len(warnings) > 0
        print(f"   {'🚨' if has_interaction else '✅'} DDI Check: {len(warnings)} interaction(s) found for RxCUIs {rxcuis}")

        return jsonify({
            "has_interaction": has_interaction,
            "warnings": warnings
        })

    except Exception as e:
        print(f"❌ DDI Route Error: {e}")
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
# 8. START SERVER (MUST BE AT THE VERY BOTTOM)
# ==========================================
if __name__ == "__main__":
    app.run(debug=True, port=5000)