import urllib.request
import json
import sys

def test_report_sharing():
    print("==================================================")
    print("RUNNING MEDAI CLINICAL REPORT SHARING TEST SUITE")
    print("==================================================")

    url = "http://localhost:5000/share-report"

    # --- SCENARIO 1: PATIENT A (Rahul) ---
    print("\n--- [TEST 1] Patient A Scenario ---")
    patient_a_payload = {
        "patient_name": "Patient A",
        "recipient_name": "Rahul",
        "recipient_email": "rahul@example.com",
        "recipient_phone": "+919876543210",
        "channel": "auto",
        "report": {
            "id": "RPT-PATIENT-A-101",
            "triage_result": "HIGH",
            "vitals": {"heart_rate": 118, "spo2": 91, "systolic_bp": 145, "diastolic_bp": 92, "steps": 1200},
            "deep_analysis": {
                "simple_summary": "Patient A displays elevated resting heart rate and borderline low SpO2.",
                "action_plan": ["Rest immediately in a cool room.", "Consult on-call cardiologist."]
            }
        }
    }

    req_a = urllib.request.Request(
        url,
        data=json.dumps(patient_a_payload).encode('utf-8'),
        headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req_a) as resp:
            data = json.loads(resp.read().decode())
            print("Status Code:", resp.status)
            print("Response:", json.dumps(data, indent=2))
            assert data["success"] is True, "Patient A share failed"
            assert data["recipient_name"] == "Rahul", "Patient A recipient mismatch"
            print("[PASSED] Patient A share test PASSED")
    except Exception as e:
        print("[FAILED] Patient A test failed:", e)

    # --- SCENARIO 2: PATIENT B (Priya) ---
    print("\n--- [TEST 2] Patient B Scenario ---")
    patient_b_payload = {
        "patient_name": "Patient B",
        "recipient_name": "Priya",
        "recipient_email": "priya@example.com",
        "recipient_phone": "+919123456789",
        "channel": "email",
        "report": {
            "id": "RPT-PATIENT-B-202",
            "triage_result": "LOW",
            "vitals": {"heart_rate": 72, "spo2": 99, "systolic_bp": 118, "diastolic_bp": 78, "steps": 8500},
            "deep_analysis": {
                "simple_summary": "Patient B vitals are fully optimal across all reference indicators.",
                "action_plan": ["Maintain 3L daily hydration.", "Continue active daily steps."]
            }
        }
    }

    req_b = urllib.request.Request(
        url,
        data=json.dumps(patient_b_payload).encode('utf-8'),
        headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req_b) as resp:
            data = json.loads(resp.read().decode())
            print("Status Code:", resp.status)
            print("Response:", json.dumps(data, indent=2))
            assert data["success"] is True, "Patient B share failed"
            assert data["recipient_name"] == "Priya", "Patient B recipient mismatch"
            print("[PASSED] Patient B share test PASSED")
    except Exception as e:
        print("[FAILED] Patient B test failed:", e)

    # --- SCENARIO 3: MISSING CONTACT VALIDATION ---
    print("\n--- [TEST 3] Missing Contact Validation ---")
    missing_contact_payload = {
        "patient_name": "Patient C",
        "recipient_name": "",
        "recipient_email": "",
        "recipient_phone": "",
        "report": {"triage_result": "LOW", "vitals": {"heart_rate": 70}}
    }
    req_c = urllib.request.Request(
        url,
        data=json.dumps(missing_contact_payload).encode('utf-8'),
        headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req_c) as resp:
            data = json.loads(resp.read().decode())
            print("Response:", data)
    except urllib.error.HTTPError as e:
        err_body = json.loads(e.read().decode())
        print("HTTP Error Status:", e.code)
        print("Error Response:", json.dumps(err_body, indent=2))
        assert e.code == 400, f"Expected 400, got {e.code}"
        print("[PASSED] Missing contact validation test PASSED")

    # --- SCENARIO 4: WHATSAPP FALLBACK TO EMAIL ---
    print("\n--- [TEST 4] WhatsApp Provider Fallback to Email ---")
    fallback_payload = {
        "patient_name": "Patient D",
        "recipient_name": "Emergency Contact D",
        "recipient_email": "sohamsatkur0@gmail.com",
        "recipient_phone": "+919999999999",
        "channel": "whatsapp",
        "report": {
            "id": "RPT-PATIENT-D-404",
            "triage_result": "MODERATE",
            "vitals": {"heart_rate": 95, "spo2": 95, "systolic_bp": 130, "diastolic_bp": 85, "steps": 4000},
            "deep_analysis": {
                "simple_summary": "Patient D vitals indicate moderate stress.",
                "action_plan": ["Monitor blood pressure every 4 hours."]
            }
        }
    }
    req_d = urllib.request.Request(
        url,
        data=json.dumps(fallback_payload).encode('utf-8'),
        headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req_d) as resp:
            data = json.loads(resp.read().decode())
            print("Status Code:", resp.status)
            print("Response:", json.dumps(data, indent=2))
            assert data["success"] is True
            assert "WhatsApp" in data["message"] or "email" in data["message"].lower()
            print("[PASSED] WhatsApp fallback to Email test PASSED")
    except Exception as e:
        print("[FAILED] Fallback test failed:", e)

    print("\n[SUCCESS] ALL REPORT SHARING TESTS COMPLETED SUCCESSFULLY!")

if __name__ == "__main__":
    test_report_sharing()
