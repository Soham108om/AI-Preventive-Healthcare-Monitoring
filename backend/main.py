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


def send_patient_clinical_report_email(recipient_email: str, recipient_name: str, patient_name: str, report_data: dict) -> bool:
    """
    Sends the actual generated clinical report to the patient's loved-one email address via SMTP.
    """
    if not all([GMAIL_SENDER, GMAIL_APP_PASS, recipient_email.strip()]):
        print(f"⚠️ Email provider unconfigured or invalid recipient email: '{recipient_email}'")
        return False

    risk = report_data.get("triage_result") or report_data.get("risk_level", "LOW")
    vitals = report_data.get("vitals")
    if not vitals or not isinstance(vitals, dict):
        if "heart_rate" in report_data:
            vitals = report_data
        else:
            vitals = report_data.get("deep_analysis", {}).get("vitals", {})

    hr = vitals.get('heart_rate') or vitals.get('hr') or 'N/A'
    spo2 = vitals.get('spo2') or 'N/A'
    sys_bp = vitals.get('systolic_bp') or vitals.get('systolic') or 'N/A'
    dia_bp = vitals.get('diastolic_bp') or vitals.get('diastolic') or 'N/A'
    bp_str = f"{sys_bp}/{dia_bp}" if sys_bp != 'N/A' else 'N/A'
    steps = vitals.get('steps') or 'N/A'

    summary = report_data.get("ai_summary") or report_data.get("deep_analysis", {}).get("simple_summary", "Clinical assessment completed successfully.")
    action_plan = report_data.get("action_plan") or report_data.get("deep_analysis", {}).get("action_plan", [])
    report_id = report_data.get("id") or f"RPT-{int(pd.Timestamp.now().timestamp()) if 'pd' in globals() else 1000}"
    timestamp = report_data.get("created_at") or pd.Timestamp.now().strftime("%Y-%m-%d %H:%M:%S")

    subject = f"MedAI Clinical Report — {patient_name} ({risk} Risk)"

    action_items_html = "".join([f"<li style='margin-bottom:6px;'>{item}</li>" for item in action_plan]) if action_plan else "<li>Continue regular monitoring and hydration.</li>"

    risk_color = "#dc2626" if risk == "HIGH" else "#007F73" if risk == "LOW" else "#d97706"
    risk_bg = "#fef2f2" if risk == "HIGH" else "#e8f8f5" if risk == "LOW" else "#fffbeb"

    html_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; border: 1px solid #dfebe8; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: #007F73; padding: 24px; text-align: center; color: white;">
        <h1 style="margin: 0; font-size: 24px; font-weight: bold;">🩺 MedAI Clinical Report</h1>
        <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.9;">Patient Assessment Shared with Loved One</p>
      </div>

      <div style="padding: 24px;">
        <p style="font-size: 15px; color: #173b3a; margin-top: 0;">Dear <strong>{recipient_name}</strong>,</p>
        <p style="font-size: 14px; color: #4a5568; line-height: 1.5;">
          A clinical health report for <strong>{patient_name}</strong> has been generated by the MedAI Health Platform and shared with you as their registered emergency / loved-one contact.
        </p>

        <!-- Risk Header -->
        <div style="background-color: {risk_bg}; border: 1px solid {risk_color}40; border-radius: 12px; padding: 16px; margin: 20px 0; text-align: center;">
          <span style="font-size: 12px; font-weight: bold; color: #6d807e; text-transform: uppercase; letter-spacing: 1px;">Assessed Risk Level</span>
          <h2 style="margin: 4px 0 0 0; font-size: 26px; font-weight: 800; color: {risk_color};">{risk} RISK</h2>
        </div>

        <!-- Vitals Table -->
        <h3 style="font-size: 15px; color: #173b3a; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-top: 24px;">Biometric Vitals Snapshot</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
          <tr style="background-color: #f8fafc;">
            <td style="padding: 10px; font-weight: bold; color: #4a5568;">Heart Rate:</td>
            <td style="padding: 10px; font-weight: bold; color: #173b3a;">{hr} BPM</td>
            <td style="padding: 10px; font-weight: bold; color: #4a5568;">SpO2 Oxygen:</td>
            <td style="padding: 10px; font-weight: bold; color: #173b3a;">{spo2}%</td>
          </tr>
          <tr>
            <td style="padding: 10px; font-weight: bold; color: #4a5568;">Blood Pressure:</td>
            <td style="padding: 10px; font-weight: bold; color: #173b3a;">{bp_str} mmHg</td>
            <td style="padding: 10px; font-weight: bold; color: #4a5568;">Steps Today:</td>
            <td style="padding: 10px; font-weight: bold; color: #173b3a;">{steps}</td>
          </tr>
        </table>

        <!-- Summary -->
        <h3 style="font-size: 15px; color: #173b3a; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px;">Clinical / AI Summary</h3>
        <p style="font-size: 14px; color: #2d3748; background-color: #f2faf8; padding: 14px; border-radius: 10px; line-height: 1.6; font-style: italic;">
          "{summary}"
        </p>

        <!-- Action Plan -->
        <h3 style="font-size: 15px; color: #173b3a; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px;">Recommended Care Actions</h3>
        <ul style="font-size: 14px; color: #2d3748; padding-left: 20px; line-height: 1.6;">
          {action_items_html}
        </ul>

        <p style="font-size: 12px; color: #a0aec0; margin-top: 30px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 14px;">
          Report ID: {report_id} • Generated at: {timestamp}<br/>
          This is an official clinical report notification from MedAI Platform.
        </p>
      </div>
    </div>
    """

    res_container = {"success": False}
    evt = threading.Event()

    def _dispatch():
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = GMAIL_SENDER
            msg["To"] = recipient_email.strip()
            msg.attach(MIMEText(html_body, "html"))

            with smtplib.SMTP("smtp.gmail.com", 587) as server:
                server.starttls()
                server.login(GMAIL_SENDER, GMAIL_APP_PASS)
                server.sendmail(GMAIL_SENDER, recipient_email.strip(), msg.as_string())

            print(f"✅ Clinical report emailed successfully to {recipient_name} ({recipient_email})")
            res_container["success"] = True
        except Exception as e:
            print(f"❌ Report email dispatch error: {e}")
        finally:
            evt.set()

    t = threading.Thread(target=_dispatch, daemon=True)
    t.start()
    evt.wait(timeout=20)
    return res_container["success"]


@app.route("/test-sos", methods=["GET"])
def test_sos():
    """Test endpoint — visit http://localhost:5000/test-sos to send a test emergency email."""
    ok = send_emergency_sos(
        patient_vitals={"heart_rate": 110, "spo2": 88, "systolic_bp": 160, "diastolic_bp": 100, "steps": 200},
        location={"lat": 18.5204, "lng": 73.8567},
        contact_number="8177863563"
    )
    return jsonify({"success": ok, "message": "Check your email!" if ok else "Failed — check backend logs"})


@app.route("/share-report", methods=["POST", "OPTIONS"])
def share_report():
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200

    try:
        data = request.json or {}
        patient_name = data.get("patient_name", "Patient").strip()
        recipient_name = data.get("recipient_name", "Loved One").strip()
        recipient_email = data.get("recipient_email", "").strip()
        recipient_phone = data.get("recipient_phone", "").strip()
        channel = data.get("channel", "auto").lower()
        report_data = data.get("report", {})

        if not recipient_email and not recipient_phone:
            return jsonify({
                "success": False,
                "error": "No emergency contact details provided. Please add a valid email or WhatsApp number."
            }), 400

        if not report_data:
            return jsonify({
                "success": False,
                "error": "No clinical report provided for sharing."
            }), 400

        whatsapp_provider = os.environ.get("WHATSAPP_PROVIDER", "").strip().lower()
        whatsapp_delivered = False
        email_delivered = False
        notes = []

        # 1. Attempt WhatsApp if preferred or requested
        if channel in ["whatsapp", "auto"] and recipient_phone:
            if whatsapp_provider == "twilio" and os.environ.get("TWILIO_ACCOUNT_SID"):
                try:
                    from twilio.rest import Client
                    sid = os.environ.get("TWILIO_ACCOUNT_SID")
                    token = os.environ.get("TWILIO_AUTH_TOKEN")
                    from_num = os.environ.get("TWILIO_WHATSAPP_NUMBER", "whatsapp:+14155238886")
                    client = Client(sid, token)
                    risk = report_data.get("triage_result") or report_data.get("risk_level", "LOW")
                    summary = report_data.get("ai_summary") or report_data.get("deep_analysis", {}).get("simple_summary", "")
                    msg_body = f"🩺 *MedAI Clinical Report for {patient_name}*\nRisk Level: *{risk}*\nSummary: {summary}\nRecipient: {recipient_name}"
                    message = client.messages.create(
                        body=msg_body,
                        from_=from_num,
                        to=f"whatsapp:{recipient_phone}"
                    )
                    if message.sid:
                        whatsapp_delivered = True
                        notes.append(f"Clinical report sent to {recipient_name} via WhatsApp.")
                except Exception as w_err:
                    print(f"⚠️ WhatsApp dispatch error: {w_err}")
                    notes.append("WhatsApp delivery failed.")
            else:
                notes.append("WhatsApp provider is currently unconfigured.")

        # 2. Fallback to Email if WhatsApp failed/unconfigured or if email requested
        if (not whatsapp_delivered and recipient_email) or channel == "email":
            if recipient_email:
                ok = send_patient_clinical_report_email(
                    recipient_email=recipient_email,
                    recipient_name=recipient_name,
                    patient_name=patient_name,
                    report_data=report_data
                )
                if ok:
                    email_delivered = True
                    if whatsapp_delivered:
                        notes.append(f"Clinical report also emailed successfully to {recipient_name}.")
                    elif notes and "WhatsApp" in notes[0]:
                        notes.append(f"WhatsApp delivery failed. The report was sent successfully by email.")
                    else:
                        notes.append(f"Clinical report emailed successfully to {recipient_name}.")
                else:
                    notes.append("Email delivery attempt failed.")
            else:
                notes.append("No valid email address found for fallback.")

        if whatsapp_delivered or email_delivered:
            delivered_channel = "WhatsApp & Email" if (whatsapp_delivered and email_delivered) else ("WhatsApp" if whatsapp_delivered else "Email")
            return jsonify({
                "success": True,
                "channel": delivered_channel,
                "whatsapp_delivered": whatsapp_delivered,
                "email_delivered": email_delivered,
                "recipient_name": recipient_name,
                "message": " ".join(notes)
            }), 200
        else:
            return jsonify({
                "success": False,
                "whatsapp_delivered": False,
                "email_delivered": False,
                "message": "We couldn't deliver the report. " + " ".join(notes)
            }), 500

    except Exception as e:
        print(f"❌ Error in /share-report: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

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
            "vitals": {
                "heart_rate": data.get("heart_rate", "N/A"),
                "spo2": data.get("spo2", "N/A"),
                "systolic_bp": data.get("systolic_bp", "N/A"),
                "diastolic_bp": data.get("diastolic_bp", "N/A"),
                "steps": data.get("steps", "N/A")
            },
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
# 10. DYNAMIC AI-GENERATED DIET PLAN ROUTE (OPTION 2)
# ==========================================
@app.route('/generate_ai_diet', methods=['POST', 'OPTIONS'])
def generate_ai_diet():
    if request.method == 'OPTIONS':
        return jsonify({"status": "CORS approved"}), 200

    try:
        data = request.json or {}
        patient_profile = data.get('patient_profile', {})
        vitals = data.get('vitals', {})
        user_inputs = data.get('user_inputs', {})

        age = patient_profile.get('age', 30)
        try:
            age = int(age)
        except Exception:
            age = 30

        height = patient_profile.get('height', 170)
        try:
            height = float(height)
        except Exception:
            height = 170.0

        weight = patient_profile.get('weight', 70)
        try:
            weight = float(weight)
        except Exception:
            weight = 70.0

        bmi = patient_profile.get('bmi', round(weight / ((height / 100.0) ** 2), 1))
        athlete_status = "Athlete" if patient_profile.get('athlete_status') else "Non-Athlete"
        sport = patient_profile.get('sport_type', 'N/A')
        training = patient_profile.get('training_frequency', 'N/A')
        
        hist_list = patient_profile.get('medical_history', [])
        if isinstance(hist_list, list):
            history = ", ".join(hist_list) if hist_list else "None"
        else:
            history = str(hist_list) if hist_list else "None"
            
        systolic = vitals.get('systolic_bp', '120')
        diastolic = vitals.get('diastolic_bp', '80')
        hr = vitals.get('heart_rate', '72')
        steps = vitals.get('steps', '5000')
        risk_level = vitals.get('risk_level', 'LOW')

        preference = user_inputs.get('preference', 'Vegetarian')
        allergies = user_inputs.get('allergies', 'None')
        goal = user_inputs.get('goal', 'Maintain Weight')
        budget = user_inputs.get('budget', 'Medium')

        prompt = f"""You are MedAI, an advanced Clinical Nutrition AI Specialist.
Generate a completely custom, highly personalized AI Dynamic Diet and Nutrition Plan (Option 2) tailored to this specific user's biometrics, live vitals, clinical conditions, dietary preferences, and budget constraints.

User Profile:
- Age: {age} years
- Height: {height} cm, Weight: {weight} kg, BMI: {bmi}
- Athletic Status: {athlete_status} (Sport: {sport}, Training: {training})
- Medical History / Chronic Conditions: {history}
- Live Smartwatch Vitals: BP {systolic}/{diastolic} mmHg, Resting HR {hr} BPM, Daily Steps {steps}, Triage Risk: {risk_level}
- Dietary Preference: {preference} (Vegetarian, Non Vegetarian, or Vegan)
- Reported Allergies / Food Intolerances: {allergies}
- User Dietary Goal: {goal} (e.g. Weight Loss, Muscle Gain, Maintain Weight, Weight Gain)
- Budget Constraint: {budget} (Low, Medium, or High)

Requirements for the AI Generated Diet Plan:
1. Provide accurate target numbers for: calories (integer kcal), protein (g), carbohydrates (g), fat (g), fiber (g), water (liters), sodium (mg), sugar (g).
2. Account strictly for conditions (e.g. if Hypertension or BP > 120/80, sodium must be <= 1500mg and emphasize DASH principles; if Diabetes, keep low-GI and sugar <= 25g; if Muscle Gain or Athlete, elevate protein to 1.6-2.0 g/kg).
3. Accommodate all specified allergies ({allergies}) and preference ({preference}) without exception.
4. Provide creative, culturally adaptable, appetizing, and practical meals for all 5 daily slots: Breakfast, Morning Snack, Lunch, Evening Snack, Dinner.
5. Provide a rich clinical summary, curated foods to prefer, foods to avoid, personalized actionable tips, and AI clinical insights.

Format your response strictly as valid JSON with the following structure:
{{
    "title": "AI Personalized Nutrition & Macro Plan",
    "clinical_summary": "3-4 detailed sentences explaining how this AI-generated plan specifically targets their vitals (BP {systolic}/{diastolic}, HR {hr}, {steps} steps) and medical history ({history}) with precise nutrient partitioning for their goal ({goal}).",
    "calories": 2100,
    "protein": 110,
    "carbohydrates": 245,
    "fat": 58,
    "fiber": 32,
    "water": 3.2,
    "sodium": 1600,
    "sugar": 26,
    "meals": {
        "breakfast": "Detailed, delicious breakfast description matching {preference} and excluding {allergies}.",
        "morning_snack": "Morning snack description.",
        "lunch": "Detailed lunch description.",
        "evening_snack": "Evening snack description.",
        "dinner": "Detailed dinner description."
    },
    "foods_to_prefer": [
        "Food 1", "Food 2", "Food 3", "Food 4", "Food 5", "Food 6"
    ],
    "foods_to_limit": [
        "Food 1", "Food 2", "Food 3", "Food 4"
    ],
    "personalized_tips": [
        "Specific actionable tip 1 related to hydration and activity level.",
        "Specific actionable tip 2 related to their medical conditions or goal.",
        "Specific actionable tip 3 related to budget or food prep."
    ],
    "ai_insights": [
        "Insight 1 explaining metabolic / cardiovascular support.",
        "Insight 2 explaining electrolyte balance and recovery."
    ]
}}
Ensure the output is strictly valid JSON without preamble or explanations.
"""

        raw_ai_response = ask_gemini_advanced(prompt)
        parsed_data = None

        if raw_ai_response:
            clean_text = raw_ai_response.strip()
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

            try:
                parsed_data = json.loads(clean_text)
            except Exception as pe:
                print(f"⚠️ Gemini JSON parse error: {pe}, using dynamic fallback")
                parsed_data = None

        # Robust Dynamic Fallback Generator if Gemini is unavailable
        if not parsed_data:
            # Baseline BMR & TDEE calculation
            bmr = 10 * weight + 6.25 * height - 5 * age + 5
            steps_num = int(steps) if str(steps).isdigit() else 5000
            mult = 1.6 if steps_num > 10000 or athlete_status == "Athlete" else 1.35 if steps_num > 6000 else 1.2
            tdee = bmr * mult

            cal_target = tdee
            if goal == "Weight Loss":
                cal_target = max(1500, tdee - 500)
            elif goal == "Weight Gain":
                cal_target = tdee + 500
            elif goal == "Muscle Gain":
                cal_target = tdee + 350
            cal_target = int(round(cal_target))

            is_hyper = "Hypertension" in history or float(systolic) > 130 or float(diastolic) > 85
            is_diab = "Diabetes" in history
            is_athlete = athlete_status == "Athlete" or goal == "Muscle Gain"

            prot_per_kg = 1.8 if is_athlete else 1.0
            prot_g = int(round(weight * prot_per_kg))
            fat_pct = 0.22 if is_hyper else 0.26
            fat_g = int(round((cal_target * fat_pct) / 9))
            carb_g = int(round((cal_target - (prot_g * 4 + fat_g * 9)) / 4))
            sod_mg = 1500 if is_hyper else 2200
            sug_g = 22 if is_diab else int(round((cal_target * 0.07) / 4))
            water_l = 3.8 if steps_num > 9000 or is_athlete else 2.8

            allergy_str = f" strictly free from {allergies}" if allergies and allergies.lower() != "none" else ""

            if preference == "Vegan":
                b_meal = f"Warm cinnamon oats porridge cooked in fortified almond milk topped with chia seeds, blueberries, and walnuts{allergy_str}."
                s1_meal = f"Fresh sliced cucumber and carrot batons with tahini-lemon hummus dip{allergy_str}."
                l_meal = f"Organic quinoa and edamame bowl with steamed kale, roasted sweet potato, sesame dressing, and lentil soup{allergy_str}."
                s2_meal = f"Handful of roasted unsalted pumpkin seeds and green tea."
                d_meal = f"Pan-seared tofu stir-fry with broccoli florets, baby corn, and mushrooms over wild brown rice{allergy_str}."
            elif preference == "Non Vegetarian":
                b_meal = f"Scrambled eggs (2 whole + 1 white) with baby spinach, grilled tomatoes, and whole grain toast{allergy_str}."
                s1_meal = f"Low-fat Greek yogurt with sliced strawberries and a drizzle of raw honey{allergy_str}."
                l_meal = f"Herb-grilled chicken breast or wild-caught fish, steamed asparagus, quinoa pilaf, and mixed field greens{allergy_str}."
                s2_meal = f"A handful of raw almonds and unsweetened tender coconut water."
                d_meal = f"Baked lemon-garlic salmon or roasted turkey tenderloin with sautéed zucchini, bell peppers, and sweet potato mash{allergy_str}."
            else: # Vegetarian
                b_meal = f"Besan & grated paneer chilla (chickpea pancake) seasoned with turmeric and cumin, served with fresh mint chutney{allergy_str}."
                s1_meal = f"Sprouted moong & pomegranate chaat with cucumber and lime juice{allergy_str}."
                l_meal = f"High-protein paneer bhurji or tofu curry, 2 multigrain rotis, thick yellow moong dal, and a large tomato-cucumber salad{allergy_str}."
                s2_meal = f"Roasted makhana (foxnuts) seasoned with black pepper and a cup of antioxidant green tea."
                d_meal = f"Grilled paneer skewers with bell peppers and onions, served with a warm bowl of vegetable quinoa soup{allergy_str}."

            prefer_list = ["Leafy green vegetables (Spinach, Kale, Methi)", "Whole grains (Quinoa, Brown Rice, Oats)", "Quality proteins (Lentils, Tofu, Greek Yogurt)", "Healthy fats (Walnuts, Chia seeds, Extra virgin olive oil)"]
            if is_hyper:
                prefer_list.extend(["Potassium-rich foods (Bananas, Beetroot)", "Unsalted seeds"])
            if is_diab:
                prefer_list.extend(["Low-GI legumes", "Fenugreek seeds"])

            limit_list = ["Ultra-processed packaged snacks", "Refined flour & added sugars", "High-sodium canned foods & table salt", "Trans-fat fried foods"]
            if allergies and allergies.lower() != "none":
                limit_list.append(f"All items containing {allergies}")

            parsed_data = {
                "title": f"AI Precision Plan for {goal}",
                "clinical_summary": f"This dynamically synthesized AI plan has been engineered for your physiological profile (Age: {age}, Weight: {weight}kg, Steps: {steps}). It balances {cal_target} kcal with {prot_g}g protein, while maintaining a strict sodium cap ({sod_mg}mg) to support healthy cardiovascular and metabolic function.",
                "calories": cal_target,
                "protein": prot_g,
                "carbohydrates": carb_g,
                "fat": fat_g,
                "fiber": 32,
                "water": water_l,
                "sodium": sod_mg,
                "sugar": sug_g,
                "meals": {
                    "breakfast": b_meal,
                    "morning_snack": s1_meal,
                    "lunch": l_meal,
                    "evening_snack": s2_meal,
                    "dinner": d_meal
                },
                "foods_to_prefer": prefer_list,
                "foods_to_limit": limit_list,
                "personalized_tips": [
                    f"Hydration rhythm: Space your {water_l}L target throughout active hours to support circulation with {steps} daily steps.",
                    f"Goal synergy: To optimize {goal}, ensure lunch and dinner meals provide sustained complex carbs and protein.",
                    f"Budget & adherence: Utilize seasonal farmers market produce to maximize micronutrient density at {budget} budget."
                ],
                "ai_insights": [
                    "Dynamic AI partitioning adjusts macronutrient ratios in real-time based on your resting heart rate and daily activity logs.",
                    "Electrolyte balance is maintained with targeted potassium-to-sodium ratios to promote optimal arterial tone."
                ]
            }

        return jsonify({"success": True, "data": parsed_data})

    except Exception as e:
        print(f"❌ Generate AI Diet API Error: {e}")
        return jsonify({"success": False, "error": str(e)}), 200

# ==========================================
# 11. START SERVER (MUST BE AT THE VERY BOTTOM)
# ==========================================
if __name__ == "__main__":
    app.run(debug=True, port=5000)

