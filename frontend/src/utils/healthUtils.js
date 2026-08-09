// ============================================================
// healthUtils.js — Shared Healthcare Utilities
// Used by: PatientDashboard, PersonalizedAnalysis
// ============================================================

import supabase from "../services/supabase";

// ── 1. HOSPITAL DATABASE ─────────────────────────────────────
export const REAL_PUNE_HOSPITALS = [
  { id: 1,  name: "VishwaRaj Hospital",       type: "General ER",   lat: 18.489742, lng: 74.022356, phone: "020 2691 9000" },
  { id: 2,  name: "Noble Hospital",            type: "Cardiac ICU",  lat: 18.504899, lng: 73.927251, phone: "020 6628 5000" },
  { id: 3,  name: "Ruby Hall Clinic",          type: "Cardiac ICU",  lat: 18.5330,   lng: 73.8772,   phone: "020 6645 5100" },
  { id: 4,  name: "Sahyadri Super Speciality", type: "General ER",   lat: 18.5029,   lng: 73.9320,   phone: "020 6721 3000" },
  { id: 5,  name: "Sancheti Hospital",         type: "Stroke Center",lat: 18.529636, lng: 73.852910, phone: "020 2899 9999" },
  { id: 6,  name: "Deenanath Mangeshkar",      type: "General ER",   lat: 18.5018,   lng: 73.8327,   phone: "020 4015 1000" },
  { id: 7,  name: "Jupiter Hospital",          type: "General ER",   lat: 18.5656,   lng: 73.7860,   phone: "020 2790 2790" },
  { id: 8,  name: "Aditya Birla Memorial",     type: "Cardiac ICU",  lat: 18.6258,   lng: 73.7749,   phone: "020 3071 7777" },
  { id: 9,  name: "Manipal Hospital",          type: "General ER",   lat: 18.541173, lng: 73.935474, phone: "020 6740 0000" },
  { id: 10, name: "Jehangir Hospital",         type: "General ER",   lat: 18.530334, lng: 73.876789, phone: "020 6688 8888" },
];

// ── 2. HAVERSINE DISTANCE ────────────────────────────────────
// Returns distance in km between two lat/lng coordinates.
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const toRad = (v) => (parseFloat(v) * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(toRad(lat1)) * Math.cos(toRad(lat2));
  return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1);
};

// ── 3. HOSPITAL SORT ─────────────────────────────────────────
// Returns the hospital list sorted by distance from (lat, lng).
export const getSortedHospitals = (lat, lng) => {
  const numLat = parseFloat(lat);
  const numLng = parseFloat(lng);
  return REAL_PUNE_HOSPITALS
    .map((h) => ({ ...h, distance: calculateDistance(numLat, numLng, h.lat, h.lng) }))
    .sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
};

// ── 4. BROWSER PUSH NOTIFICATION ────────────────────────────
// Fires a browser push notification for HIGH RISK events.
export const triggerBrowserNotification = (vitals, contact) => {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification("MEDAI Emergency Alert", {
      body: `HIGH RISK detected!\nHR: ${vitals.heart_rate} BPM | SpO2: ${vitals.spo2}% | BP: ${vitals.systolic_bp}/${vitals.diastolic_bp} mmHg\nAlert sent to: ${contact || "emergency contact"}`,
      icon: "/favicon.ico",
      tag: "medai-emergency",
      requireInteraction: true,
    });
  }
};

// ── 5. SUPABASE EMERGENCY LOG ────────────────────────────────
// Writes an emergency event to the emergency_logs table for audit trail.
export const logEmergencyToSupabase = async (vitals, location, contact) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("emergency_logs").insert([{
      patient_id:        user?.id,
      heart_rate:        parseInt(vitals.heart_rate),
      spo2:              parseInt(vitals.spo2),
      systolic_bp:       parseInt(vitals.systolic_bp),
      diastolic_bp:      parseInt(vitals.diastolic_bp),
      steps:             parseInt(vitals.steps),
      emergency_contact: contact,
      location_lat:      location?.lat || null,
      location_lng:      location?.lng || null,
      triggered_at:      new Date().toISOString(),
    }]);
  } catch (err) {
    console.warn("Could not log emergency to Supabase:", err.message);
  }
};

// ── 6. BLE SMARTWATCH CONNECTION ─────────────────────────────
// Connects to a BLE smartwatch and streams heart rate via GATT UUID 2a37.
// setBleStatus and setHeartRate are setState callbacks passed from the page.
export const crackFireBoltt = async (setBleStatus, setHeartRate) => {
  try {
    setBleStatus("Connecting...");
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: ["heart_rate", 0x180d, 0xfee7, 0xfee0],
    });
    const server = await device.gatt.connect();
    const services = await server.getPrimaryServices();
    for (const service of services) {
      const characteristics = await service.getCharacteristics();
      for (const char of characteristics) {
        if (char.uuid.includes("2a37")) {
          await char.startNotifications();
          char.addEventListener("characteristicvaluechanged", (e) => {
            const val = e.target.value;
            const hr = val.getUint8(0) & 0x1 ? val.getUint16(1, true) : val.getUint8(1);
            setHeartRate(hr.toString());
          });
        }
      }
    }
    setBleStatus("Live");
  } catch {
    setBleStatus("Failed");
  }
};

// ── 7. GOOGLE FIT OAUTH SCOPE ────────────────────────────────
export const GOOGLE_FIT_SCOPE = [
  "https://www.googleapis.com/auth/fitness.activity.read",
  "https://www.googleapis.com/auth/fitness.heart_rate.read",
  "https://www.googleapis.com/auth/fitness.blood_pressure.read",
  "https://www.googleapis.com/auth/fitness.oxygen_saturation.read",
].join(" ");
