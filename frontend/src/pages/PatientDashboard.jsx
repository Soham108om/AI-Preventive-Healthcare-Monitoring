import { useState, useEffect, useRef } from "react";
import supabase from "../services/supabase";
import { 
  Activity, LogOut, Ambulance, MapPin, Phone, 
  RefreshCw, Edit2, Watch, Terminal, Send, 
  CheckCircle, Clock, LayoutDashboard, History, HeartPulse, Download,
  MessageSquare, X, Languages, Mic, Volume2, Square,
  Pill, ShoppingCart, AlertOctagon, ExternalLink, CalendarDays, Trash2, Camera, UploadCloud
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import { useGoogleLogin } from '@react-oauth/google';
import { fetchGoogleFitData } from '../services/googleFit';

// 🏥 VERIFIED HOSPITAL DATABASE
const REAL_PUNE_HOSPITALS = [
  { id: 1, name: "VishwaRaj Hospital", type: "General ER", lat: 18.489742, lng: 74.022356, phone: "020 2691 9000" },
  { id: 2, name: "Noble Hospital", type: "Cardiac ICU", lat: 18.504899, lng: 73.927251, phone: "020 6628 5000" },
  { id: 3, name: "Ruby Hall Clinic", type: "Cardiac ICU", lat: 18.5330, lng: 73.8772, phone: "020 6645 5100" },
  { id: 4, name: "Sahyadri Super Speciality", type: "General ER", lat: 18.5029, lng: 73.9320, phone: "020 6721 3000" },
  { id: 5, name: "Sancheti Hospital", type: "Stroke Center", lat: 18.529636, lng: 73.852910, phone: "020 2899 9999" },
  { id: 6, name: "Deenanath Mangeshkar", type: "General ER", lat: 18.5018, lng: 73.8327, phone: "020 4015 1000" },
  { id: 7, name: "Jupiter Hospital", type: "General ER", lat: 18.5656, lng: 73.7860, phone: "020 2790 2790" },
  { id: 8, name: "Aditya Birla Memorial", type: "Cardiac ICU", lat: 18.6258, lng: 73.7749, phone: "020 3071 7777" },
  { id: 9, name: "Manipal Hospital", type: "General ER", lat: 18.541173, lng: 73.935474, phone: "020 6740 0000" },
  { id: 10, name: "Jehangir Hospital", type: "General ER", lat: 18.530334, lng: 73.876789, phone: "020 6688 8888" }
];

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const toRad = (v) => (parseFloat(v) * Math.PI) / 180;
  const R = 6371; 
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(toRad(lat1)) * Math.cos(toRad(lat2));
  return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1);
};

const PatientDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("live"); 
  const [inputs, setInputs] = useState({ heart_rate: "100", spo2: "90", systolic_bp: "120", diastolic_bp: "80", steps: "3000" });
  const [result, setResult] = useState(null); 
  const [loading, setLoading] = useState(false);
  const [hospitalList, setHospitalList] = useState([]); 
  const [showHospitals, setShowHospitals] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [manualMode, setManualMode] = useState(false);
  const [bleStatus, setBleStatus] = useState("Disconnected");
  const [doctorsList, setDoctorsList] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState(null);
  const [historyReports, setHistoryReports] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);

  // 🤖 VOICE CHATBOT STATE
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [chatMessages, setChatMessages] = useState([{ text: "Hello! I am MedAI Voice. I can speak and listen in English, Hindi, and Marathi.", sender: "bot" }]);
  const [chatInput, setChatInput] = useState("");
  const [chatLanguage, setChatLanguage] = useState("en");
  const chatEndRef = useRef(null);
  const voicesRef = useRef([]);

  // 💊 PHARMACY STATE MOCK DATA
  const [showAddMedModal, setShowAddMedModal] = useState(false);
  const [newMed, setNewMed] = useState({ name: '', dosage: '', frequency: '1 pill daily', total_pills: '', remaining_pills: '', expiry_date: '' });
  const [scanningPill, setScanningPill] = useState(false);
  const fileInputRef = useRef(null);

  const [medications, setMedications] = useState([]);

  // 🆘 DDI CHECKER + EMERGENCY SOS STATE
  const [emergencyContact, setEmergencyContact] = useState("");
  const [emergencyEmail, setEmergencyEmail]     = useState("");  // per-user alert destination
  const [savingContact,  setSavingContact]       = useState(false);
  const [contactSaved,   setContactSaved]        = useState(false);
  const [sosBannerVisible, setSosBannerVisible] = useState(false);
  const [sosAlertSent, setSosAlertSent] = useState(false);
  const [ddiWarning, setDdiWarning] = useState(null);
  const [ddiChecking, setDdiChecking] = useState(false);

  // Cache voices on load — Chrome exposes them asynchronously
  useEffect(() => {
    const loadVoices = () => { voicesRef.current = window.speechSynthesis.getVoices(); };
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, []);

  // 🔔 Request browser notification permission on first load
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    // Load doctors list
    const { data: docs } = await supabase.from('profiles').select('id, full_name, rating').eq('role', 'doctor').order('rating', { ascending: false });
    if (docs) setDoctorsList(docs);

    // 🔑 Load THIS user's saved emergency contact from their profile
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('emergency_phone, emergency_email')
        .eq('id', user.id)
        .single();
      if (profile) {
        if (profile.emergency_phone) setEmergencyContact(profile.emergency_phone);
        if (profile.emergency_email) setEmergencyEmail(profile.emergency_email);
      }
    } catch (err) {
      console.warn('⚠️ Could not load emergency contact from profile:', err.message);
    }
  };

  useEffect(() => {
    if (activeTab === "history") fetchHistory();
  }, [activeTab]);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from('medical_reports').select('*').eq('patient_id', user.id).order('created_at', { ascending: false });
      setHistoryReports(data || []);
    } catch (err) { console.error(err); } finally { setLoadingHistory(false); }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); navigate("/login"); };

  // --- 🎙️ SPEECH TO TEXT ---
  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Browser does not support voice recognition.");

    const recognition = new SpeechRecognition();
    recognition.lang = chatLanguage === "en" ? "en-US" : chatLanguage === "hi" ? "hi-IN" : "mr-IN";
    
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setChatInput(transcript);
      handleChatSend(transcript, chatLanguage); // pass language at call time
    };
    recognition.start();
  };

  // --- 🔊 TEXT TO SPEECH ---
  const speak = (text, lang = chatLanguage) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const bcp47 = lang === "en" ? "en-US" : lang === "hi" ? "hi-IN" : "mr-IN";
    utterance.lang = bcp47;
    utterance.rate = 0.9;

    // Use pre-cached voices — avoids Chrome's async empty-list bug
    const voices = voicesRef.current;
    const match =
      voices.find((v) => v.lang === bcp47) ||
      voices.find((v) => v.lang.startsWith(bcp47.split("-")[0]));
    if (match) utterance.voice = match;

    window.speechSynthesis.speak(utterance);
  };

  // --- 🚀 DIAGNOSTIC CHAT SEND ---
  const handleChatSend = async (forcedInput = null, forcedLang = null) => {
    const textToSend = typeof forcedInput === 'string' ? forcedInput : chatInput;
    const currentLang = forcedLang || chatLanguage; // capture language at send time
    console.log("🚀 1. Sending Message:", textToSend);
    
    if (!textToSend.trim()) return;

    // Instantly show user message in UI
    setChatMessages(prev => [...prev, { text: textToSend, sender: "user" }]);
    setChatInput("");

    try {
      console.log("📡 2. Requesting from Flask port 5000...");
      const res = await fetch("http://localhost:5000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          language: currentLang,
          vitals: inputs  // 🩺 Live patient context — heart rate, SpO2, BP, steps
        })
      });
      
      const data = await res.json();
      console.log("✅ 3. Response Received:", data);
      
      setChatMessages(prev => [...prev, { text: data.chat_response, sender: "bot" }]);
      speak(data.chat_response, currentLang); // pass language explicitly — no stale closure
    } catch (e) {
      console.error("❌ 4. Fetch Error:", e);
      setChatMessages(prev => [...prev, { text: "AI Service is currently offline. Please check console.", sender: "bot" }]);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const loginToGoogleFit = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setLoading(true);
        const fitData = await fetchGoogleFitData(tokenResponse.access_token);
        setInputs(prev => ({ ...prev, steps: fitData.steps, heart_rate: fitData.heartRate, spo2: fitData.spo2, systolic_bp: fitData.systolic, diastolic_bp: fitData.diastolic }));
        alert("Google Fit Data Synced!");
      } catch (err) { alert("Sync failed."); } finally { setLoading(false); }
    },
    // 🟢 FIXED: Clean scope string without Markdown links
    scope: "https://www.googleapis.com/auth/fitness.activity.read https://www.googleapis.com/auth/fitness.heart_rate.read https://www.googleapis.com/auth/fitness.blood_pressure.read https://www.googleapis.com/auth/fitness.oxygen_saturation.read",
  });

  const crackFireBoltt = async () => {
    try {
      setBleStatus("Cracking...");
      const device = await navigator.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: ['heart_rate', 0x180D, 0xfee7, 0xfee0] });
      const server = await device.gatt.connect();
      const services = await server.getPrimaryServices();
      for (const service of services) {
        const characteristics = await service.getCharacteristics();
        for (const char of characteristics) {
          if (char.uuid.includes('2a37')) {
            await char.startNotifications();
            char.addEventListener('characteristicvaluechanged', (e) => {
              const val = e.target.value;
              const hr = (val.getUint8(0) & 0x1) ? val.getUint16(1, true) : val.getUint8(1);
              setInputs(p => ({ ...p, heart_rate: hr.toString() }));
            });
          }
        }
      }
      setBleStatus("Live 🔴");
    } catch (e) { setBleStatus("Failed"); }
  };

  const handleFindHospital = (overrideLat = null, overrideLng = null) => {
    if (overrideLat && overrideLng) { updateHospitals(overrideLat, overrideLng); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => updateHospitals(pos.coords.latitude, pos.coords.longitude),
      () => { setManualMode(true); },
      { enableHighAccuracy: true }
    );
  };

  const updateHospitals = (lat, lng) => {
    const numLat = parseFloat(lat); const numLng = parseFloat(lng);
    setUserLocation({ lat: numLat.toFixed(4), lng: numLng.toFixed(4) });
    const hospitals = REAL_PUNE_HOSPITALS.map(h => ({ ...h, distance: calculateDistance(numLat, numLng, h.lat, h.lng) })).sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
    setHospitalList(hospitals); setShowHospitals(true);
  };

  // 🔔 Show browser push notification for HIGH RISK
  const triggerBrowserNotification = (vitals, contact) => {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("🚨 MEDAI Emergency Alert", {
        body: `HIGH RISK detected!\nHR: ${vitals.heart_rate} BPM | SpO2: ${vitals.spo2}% | BP: ${vitals.systolic_bp}/${vitals.diastolic_bp} mmHg\nAlert sent to: ${contact || "emergency contact"}`,
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        tag: "medai-emergency",
        requireInteraction: true,   // stays until user dismisses
      });
    }
  };

  // 🗄️ Log emergency event to Supabase for audit trail
  const logEmergencyToSupabase = async (vitals, location, contact) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('emergency_logs').insert([{
        patient_id:       user?.id,
        heart_rate:       parseInt(vitals.heart_rate),
        spo2:             parseInt(vitals.spo2),
        systolic_bp:      parseInt(vitals.systolic_bp),
        diastolic_bp:     parseInt(vitals.diastolic_bp),
        steps:            parseInt(vitals.steps),
        emergency_contact: contact,
        location_lat:     location?.lat || null,
        location_lng:     location?.lng || null,
        triggered_at:     new Date().toISOString(),
      }]);
      console.log("✅ Emergency event logged to Supabase");
    } catch (err) {
      // Non-critical — don't block the UI if table doesn't exist yet
      console.warn("⚠️ Could not log emergency to Supabase:", err.message);
    }
  };

  const handleAnalyze = async () => {
    setLoading(true); setResult(null); setShowHospitals(false); setSendSuccess(false); setSosBannerVisible(false); setSosAlertSent(false);
    try {
      const payload = {
        ...inputs,
        emergency_contact: emergencyContact,
        emergency_email:   emergencyEmail,   // 📧 per-user email — backend sends here, NOT hardcoded
        location: userLocation ? { lat: userLocation.lat, lng: userLocation.lng } : {}
      };
      const res = await fetch("http://localhost:5000/predict", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      setResult(data);

      if (data.triage_result === 'HIGH') {
        handleFindHospital();

        // 🔔 1. Instant browser push notification (works immediately, no setup)
        triggerBrowserNotification(inputs, emergencyContact);

        // 🗄️ 2. Log to Supabase for audit trail
        logEmergencyToSupabase(inputs, userLocation, emergencyContact);

        // 📧 3. Show SOS banner — email was attempted by backend
        setSosBannerVisible(true);
        setSosAlertSent(true);
        // Keep banner visible until user refreshes analysis
      }
    } catch (e) { alert("AI Service Offline"); } finally { setLoading(false); }
  };

  const handleSendToDoctor = async () => {
    if (!selectedDoctorId) { alert("Please select a doctor first."); return; }
    setIsSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      console.log("🔍 Inserting report for user:", user?.id, "→ doctor:", selectedDoctorId);
      const { data: insertData, error } = await supabase.from('medical_reports').insert([{ 
        patient_id: user.id, 
        doctor_id: selectedDoctorId, 
        vitals: inputs, 
        ai_summary: result.deep_analysis?.simple_summary || "Automated analysis completed.", 
        risk_level: result.triage_result || "LOW", 
        status: "Pending Review" 
      }]).select();
      if (error) {
        console.error("❌ Supabase insert error:", JSON.stringify(error, null, 2));
        alert(`Supabase Error: ${error.message}\nCode: ${error.code}\nDetails: ${error.details}`);
        throw error;
      }
      console.log("✅ Report inserted:", insertData);
      setSendSuccess(true);
    } catch (e) { 
      console.error("❌ handleSendToDoctor failed:", e);
    } finally { setIsSending(false); }
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    let currentY = 0;
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, 210, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("MedAI Clinical Triage Report", 15, 22);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 15, 29);
    currentY = 45;
    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(252, 165, 165);
    doc.roundedRect(15, currentY, 180, 12, 2, 2, 'FD');
    doc.setTextColor(220, 38, 38);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("WARNING: AI-GENERATED PRELIMINARY REPORT - REQUIRES PHYSICIAN VERIFICATION", 20, currentY + 8);
    currentY += 25;
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Patient Vitals Snapshot", 15, currentY);
    currentY += 5;
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(15, currentY, 180, 25, 2, 2, 'FD');
    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139);
    doc.text("Heart Rate:", 20, currentY + 10);
    doc.text("SpO2 (Oxygen):", 110, currentY + 10);
    doc.text("Blood Pressure:", 20, currentY + 20);
    doc.text("Activity:", 110, currentY + 20);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(`${inputs.heart_rate} BPM`, 48, currentY + 10);
    doc.text(`${inputs.spo2}%`, 142, currentY + 10);
    doc.text(`${inputs.systolic_bp} / ${inputs.diastolic_bp} mmHg`, 52, currentY + 20);
    doc.text(`${inputs.steps} Steps`, 128, currentY + 20);
    currentY += 40;
    if (result) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("Diagnostic Analysis", 15, currentY);
      currentY += 6;
      if (result.triage_result === "HIGH") { doc.setFillColor(239, 68, 68); } else if (result.triage_result === "LOW") { doc.setFillColor(16, 185, 129); } else { doc.setFillColor(245, 158, 11); }
      doc.roundedRect(15, currentY, 35, 8, 1, 1, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.text(`${result.triage_result} RISK`, 20, currentY + 6);
      currentY += 16;
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("Clinical Summary:", 15, currentY);
      currentY += 6;
      doc.setTextColor(71, 85, 105);
      doc.setFont("helvetica", "normal");
      const summaryText = result.deep_analysis?.simple_summary || "No summary available.";
      const summaryLines = doc.splitTextToSize(summaryText, 180);
      doc.text(summaryLines, 15, currentY);
      currentY += (summaryLines.length * 5) + 8; 
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.text("Recommended Action Plan:", 15, currentY);
      currentY += 6;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      const actions = result.deep_analysis?.action_plan || [];
      actions.forEach((action, index) => {
        const actionLines = doc.splitTextToSize(`${index + 1}. ${action}`, 175);
        doc.text(actionLines, 20, currentY);
        currentY += (actionLines.length * 5) + 2;
      });
      currentY += 6;
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text("Care Setting:", 15, currentY);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(37, 99, 235);
      doc.text(`${result.deep_analysis?.hospital_recommendation || "N/A"}`, 45, currentY);
    } else {
      doc.setFont("helvetica", "italic");
      doc.setTextColor(148, 163, 184);
      doc.text("AI Analysis not yet performed. Please process vitals first.", 15, currentY);
    }
    const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
    doc.setDrawColor(226, 232, 240);
    doc.line(15, pageHeight - 15, 195, pageHeight - 15);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("MedAI Platform | Strictly for informational purposes. Not a substitute for professional medical advice.", 105, pageHeight - 8, null, null, "center");
    doc.save(`MedAI_Clinical_Chart_${new Date().getTime()}.pdf`);
  };

  return (
    <div className="flex min-h-screen bg-white font-sans text-slate-900 selection:bg-blue-100">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        .serif { font-family: 'Instrument Serif', serif; }
      `}</style>

      {/* SIDEBAR */}
      <aside className="hidden lg:flex flex-col w-72 bg-slate-50 border-r border-slate-200 p-8 fixed h-full">
        <div className="flex items-center gap-3 mb-12">
          <div className="bg-blue-600 p-2 rounded-xl shadow-lg"><Activity className="text-white" size={24} /></div>
          <span className="serif text-2xl">MedAI</span>
        </div>
        <nav className="flex-1 space-y-2">
          <button onClick={() => setActiveTab("live")} className={`w-full flex items-center justify-between p-4 rounded-2xl font-bold text-sm ${activeTab === 'live' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-400'}`}>
            <div className="flex items-center gap-3"><LayoutDashboard size={20}/> Dashboard</div>
          </button>
          <button onClick={() => setActiveTab("history")} className={`w-full flex items-center justify-between p-4 rounded-2xl font-bold text-sm ${activeTab === 'history' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-400'}`}>
            <div className="flex items-center gap-3"><History size={20}/> Records</div>
          </button>
          <button onClick={() => setActiveTab("pharmacy")} className={`w-full flex items-center justify-between p-4 rounded-2xl font-bold text-sm ${activeTab === 'pharmacy' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-400'}`}>
            <div className="flex items-center gap-3"><Pill size={20}/> Pharmacy & Meds</div>
          </button>
        </nav>
        <button onClick={handleLogout} className="flex items-center gap-3 p-4 text-slate-400 font-bold text-sm hover:text-red-500 transition-colors"><LogOut size={20}/> Sign Out</button>
      </aside>

      <main className="flex-1 lg:ml-72 p-8 md:p-12 max-w-6xl mx-auto w-full">
        {activeTab === "live" && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
              <div>
                <h1 className="serif text-6xl text-slate-900 mb-2 tracking-tight">Live Triage</h1>
                <p className="text-slate-400 font-medium tracking-tight">Diagnostic analysis & emergency Haversine routing.</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setManualMode(!manualMode)} className="bg-white p-4 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-500 transition-all shadow-sm"><Edit2 size={18}/></button>
                <button onClick={() => loginToGoogleFit()} className="px-6 py-4 rounded-2xl font-bold text-sm bg-white border border-slate-200 flex items-center gap-3 shadow-sm hover:bg-slate-50 transition-all"><Watch size={18} className="text-blue-600"/> Sync Fit</button>
                <button onClick={crackFireBoltt} className={`px-6 py-4 rounded-2xl font-bold text-sm border flex items-center gap-3 transition-all ${bleStatus === "Live 🔴" ? "bg-emerald-50 text-emerald-600 border-emerald-200 shadow-sm" : "bg-slate-900 text-emerald-400 border-slate-800"}`}>
                    <Terminal size={18} className={bleStatus === "Live 🔴" ? "animate-pulse" : ""}/> {bleStatus === "Live 🔴" ? "Stream Active" : "Connect Device"}
                </button>
              </div>
            </header>

            {manualMode && (
                <form onSubmit={(e) => { e.preventDefault(); handleFindHospital(e.target.lat.value, e.target.lng.value); }} className="bg-slate-50 p-6 rounded-3xl mb-8 grid grid-cols-1 md:grid-cols-3 gap-4 border border-slate-100 animate-in slide-in-from-top-4">
                    <div><label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Latitude</label><input name="lat" defaultValue="18.5793" className="w-full bg-white border border-slate-200 p-3 rounded-xl outline-none" required/></div>
                    <div><label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Longitude</label><input name="lng" defaultValue="73.9806" className="w-full bg-white border border-slate-200 p-3 rounded-xl outline-none" required/></div>
                    <div className="flex items-end"><button className="w-full bg-slate-900 text-white p-3 rounded-xl font-bold">Set GPS Origin</button></div>
                </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Heart Rate</span>
                <div className="flex items-baseline gap-2">
                  <input type="number" value={inputs.heart_rate} onChange={e => setInputs({...inputs, heart_rate: e.target.value})} className="serif text-4xl w-full bg-transparent border-none outline-none text-slate-900"/>
                  <span className="text-xs font-bold text-slate-300">BPM</span>
                </div>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">SpO2</span>
                <div className="flex items-baseline gap-2">
                  <input type="number" value={inputs.spo2} onChange={e => setInputs({...inputs, spo2: e.target.value})} className="serif text-4xl w-full bg-transparent border-none outline-none text-slate-900"/>
                  <span className="text-xs font-bold text-slate-300">%</span>
                </div>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Blood Pressure</span>
                <div className="flex items-baseline gap-2">
                  <input type="number" value={inputs.systolic_bp} onChange={e => setInputs({...inputs, systolic_bp: e.target.value})} className="serif text-4xl w-full bg-transparent border-none outline-none text-slate-900 text-center"/>
                  <span className="serif text-4xl text-slate-300">/</span>
                  <input type="number" value={inputs.diastolic_bp} onChange={e => setInputs({...inputs, diastolic_bp: e.target.value})} className="serif text-4xl w-full bg-transparent border-none outline-none text-slate-900 text-center"/>
                  <span className="text-xs font-bold text-slate-300 hidden xl:block">mmHg</span>
                </div>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Steps</span>
                <div className="flex items-baseline gap-2">
                  <input type="number" value={inputs.steps} onChange={e => setInputs({...inputs, steps: e.target.value})} className="serif text-4xl w-full bg-transparent border-none outline-none text-slate-900"/>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8 space-y-8">
                {result ? (
                  <>
                    <div className={`p-10 rounded-[40px] border-l-[16px] shadow-xl bg-white ${result.triage_result === 'HIGH' ? 'border-red-500' : 'border-emerald-500'}`}>
                      {/* 🆘 SOS Multi-Channel Alert Banner */}
                      {sosBannerVisible && (
                        <div className="mb-6 rounded-2xl overflow-hidden shadow-xl animate-in slide-in-from-top-2 duration-300 border border-red-200">
                          <div className="bg-red-600 text-white px-6 py-4 flex items-center gap-3">
                            <Ambulance size={22} className="shrink-0 animate-pulse"/>
                            <div>
                              <p className="font-black text-sm uppercase tracking-widest">🚨 Emergency SOS Dispatched</p>
                              <p className="text-xs opacity-80 mt-0.5">All emergency channels activated for: <strong>{emergencyContact || "emergency contact"}</strong></p>
                            </div>
                          </div>
                          <div className="bg-red-50 px-6 py-4 grid grid-cols-3 gap-3 text-center">
                            <div className="bg-white rounded-xl p-3 border border-red-100">
                              <p className="text-lg mb-1">🔔</p>
                              <p className="text-[10px] font-black uppercase tracking-widest text-red-600">Browser Alert</p>
                              <p className="text-[10px] text-slate-500 mt-0.5">Sent to this device</p>
                            </div>
                            <div className="bg-white rounded-xl p-3 border border-red-100">
                              <p className="text-lg mb-1">📧</p>
                              <p className="text-[10px] font-black uppercase tracking-widest text-red-600">Email Alert</p>
                              <p className="text-[10px] text-slate-500 mt-0.5">Via Gmail SMTP</p>
                            </div>
                            <div className="bg-white rounded-xl p-3 border border-red-100">
                              <p className="text-lg mb-1">🗄️</p>
                              <p className="text-[10px] font-black uppercase tracking-widest text-red-600">DB Logged</p>
                              <p className="text-[10px] text-slate-500 mt-0.5">Saved to Supabase</p>
                            </div>
                          </div>
                        </div>
                      )}
                      <h2 className="serif text-6xl text-slate-900 mb-4 tracking-tight uppercase">{result.triage_result} RISK</h2>
                      <p className="text-slate-400 font-medium text-lg leading-relaxed italic mb-8">"{result.deep_analysis?.simple_summary}"</p>
                      <div className="flex gap-4 flex-wrap">
                        <button onClick={handleAnalyze} className="bg-slate-900 text-white px-8 py-5 rounded-2xl font-bold flex items-center gap-3 hover:bg-slate-800 transition-all shadow-lg">
                          <RefreshCw size={20} className={loading ? "animate-spin" : ""}/> Refresh Analysis
                        </button>
                        <button onClick={handleDownloadPDF} className="bg-blue-50 text-blue-600 border border-blue-200 px-8 py-5 rounded-2xl font-bold flex items-center gap-3 hover:bg-blue-100 transition-all shadow-sm">
                          <Download size={20}/> Download Chart
                        </button>
                      </div>
                    </div>
                    {result.triage_result === 'HIGH' && showHospitals && (
                      <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-red-600 p-8 rounded-[40px] text-white flex justify-between items-center shadow-2xl">
                          <div className="flex items-center gap-6"><Ambulance size={40}/><div><h3 className="font-extrabold text-2xl uppercase tracking-tighter">Emergency Triage Active</h3><p className="opacity-80 italic">Haversine routing to nearest Pune hospitals...</p></div></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {hospitalList.map(h => (
                            <div key={h.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-md flex justify-between items-center group hover:border-red-200 transition-all">
                              <div><p className="font-bold text-slate-800">{h.name}</p><span className="text-xs text-emerald-600 font-black uppercase tracking-widest">{h.distance} km away</span></div>
                              <div className="flex gap-2">
                                <a href={`tel:${h.phone}`} className="bg-slate-50 text-slate-900 p-3 rounded-xl border hover:bg-white"><Phone size={18}/></a>
                                <a href={`https://www.google.com/maps/dir/?api=1&origin=${userLocation?.lat},${userLocation?.lng}&destination=${h.lat},${h.lng}&travelmode=driving`} target="_blank" rel="noreferrer" className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all"><MapPin size={18}/></a>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-[40px] p-20 text-center">
                    <Activity size={48} className="text-slate-200 mb-6"/><button onClick={handleAnalyze} className="bg-blue-600 text-white px-10 py-5 rounded-2xl font-bold shadow-xl hover:scale-105 transition-all">Begin AI Assessment</button>
                  </div>
                )}
              </div>

              <div className="lg:col-span-4 bg-white p-8 rounded-[40px] border border-slate-100 shadow-xl h-fit">
                <h3 className="serif text-3xl mb-6 tracking-tight">Reviewing Physician</h3>
                <div className="space-y-3 mb-8">
                  {doctorsList.map(doc => (
                    <button key={doc.id} onClick={() => setSelectedDoctorId(doc.id)} className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${selectedDoctorId === doc.id ? 'bg-blue-50 border-blue-600 shadow-sm' : 'bg-white hover:border-slate-300'}`}>
                      <p className="text-sm font-bold tracking-tight">Dr. {doc.full_name}</p>
                      {selectedDoctorId === doc.id && <CheckCircle size={18} className="text-blue-600"/>}
                    </button>
                  ))}
                </div>

                {/* 🆘 Emergency Contact Card — per-user, saved to Supabase */}
                <div className="mb-6 bg-red-50 border border-red-100 rounded-3xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-red-500">Emergency SOS Contact</label>
                    {contactSaved && <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1"><CheckCircle size={10}/> Saved</span>}
                  </div>

                  {/* Phone */}
                  <div className="flex items-center gap-2 bg-white border border-red-100 rounded-2xl px-4 py-3 mb-2 focus-within:ring-2 focus-within:ring-red-200 transition-all">
                    <Phone size={14} className="text-red-400 shrink-0"/>
                    <input
                      id="emergency-contact-input"
                      type="tel"
                      value={emergencyContact}
                      onChange={e => { setEmergencyContact(e.target.value); setContactSaved(false); }}
                      placeholder="Emergency phone number"
                      className="bg-transparent outline-none text-sm font-bold text-slate-700 w-full placeholder:text-red-200"
                    />
                  </div>

                  {/* Email */}
                  <div className="flex items-center gap-2 bg-white border border-red-100 rounded-2xl px-4 py-3 mb-3 focus-within:ring-2 focus-within:ring-red-200 transition-all">
                    <span className="text-red-400 shrink-0 text-xs font-black">@</span>
                    <input
                      id="emergency-email-input"
                      type="email"
                      value={emergencyEmail}
                      onChange={e => { setEmergencyEmail(e.target.value); setContactSaved(false); }}
                      placeholder="Emergency contact email"
                      className="bg-transparent outline-none text-sm font-bold text-slate-700 w-full placeholder:text-red-200"
                    />
                  </div>

                  {/* Save button */}
                  <button
                    onClick={async () => {
                      setSavingContact(true);
                      try {
                        const { data: { user } } = await supabase.auth.getUser();
                        await supabase.from('profiles').update({
                          emergency_phone: emergencyContact,
                          emergency_email: emergencyEmail,
                        }).eq('id', user.id);
                        setContactSaved(true);
                      } catch (err) {
                        alert('Could not save: ' + err.message);
                      } finally { setSavingContact(false); }
                    }}
                    disabled={savingContact || (!emergencyContact && !emergencyEmail)}
                    className="w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-widest bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
                  >
                    {savingContact ? <RefreshCw size={12} className="animate-spin"/> : <CheckCircle size={12}/>}
                    {savingContact ? 'Saving...' : 'Save Emergency Contact'}
                  </button>
                  <p className="text-[10px] text-slate-400 mt-2 text-center">Saved once — reloads automatically every session.</p>
                </div>

                <button 
                  onClick={handleSendToDoctor} 
                  disabled={!result || !selectedDoctorId || isSending} 
                  className={`w-full py-5 rounded-2xl font-bold transition-all flex justify-center items-center gap-3 ${sendSuccess ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white hover:bg-blue-600 disabled:opacity-30'}`}
                >
                  {sendSuccess ? <><CheckCircle size={18}/> Sent Successfully</> : <><Send size={18}/> Transmit Data</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "history" && (
          <div className="animate-in slide-in-from-bottom-6 duration-700 space-y-8">
            <h2 className="serif text-6xl tracking-tight mb-12">Clinical History</h2>
            {loadingHistory ? (
              <div className="flex justify-center p-20 animate-spin text-blue-600"><RefreshCw size={48}/></div>
            ) : historyReports.map(report => (
              <div key={report.id} className="bg-white rounded-[40px] border border-slate-100 shadow-lg p-10 flex flex-col md:flex-row justify-between gap-10">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-6">
                    <span className={`px-4 py-2 rounded-full font-black text-[10px] uppercase tracking-widest ${report.risk_level === 'HIGH' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>{report.risk_level} Risk</span>
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">{new Date(report.created_at).toLocaleDateString()}</span>
                  </div>
                  <h4 className="serif text-4xl mb-6 text-slate-900 italic tracking-tight leading-none leading-tight">"{report.ai_summary}"</h4>
                </div>
                <div className="md:w-80 bg-slate-50 rounded-[32px] p-8 border border-slate-100 flex flex-col justify-between">
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Physician Note</h5>
                  {report.status === 'Verified' ? (
                    <div className="space-y-4">
                      <p className="text-sm font-medium text-slate-600 italic leading-relaxed">"{report.doctor_notes}"</p>
                      <div className="flex items-center gap-2 pt-4 border-t border-slate-200">
                         <div className="bg-emerald-50 text-emerald-600 p-1.5 rounded-full"><CheckCircle size={10}/></div>
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest tracking-widest">Digitally Signed</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-4 text-slate-300 h-full"><Clock size={32} className="animate-pulse"/><p className="text-[10px] font-bold uppercase tracking-widest">Awaiting Verification</p></div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "pharmacy" && (
          <div className="space-y-8 animate-in slide-in-from-bottom-6 duration-700">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
              <div>
                <h1 className="serif text-5xl md:text-6xl text-slate-900 mb-2 tracking-tight">Digital Pillbox</h1>
                <p className="text-slate-400 font-medium tracking-tight">Track inventory, expiry dates, and activate smart 1-click refills.</p>
              </div>
              <div className="flex gap-3">
                <button className="bg-slate-900 text-white px-6 py-4 rounded-2xl font-bold text-sm flex items-center gap-3 shadow-xl hover:bg-blue-600 transition-all"><ShoppingCart size={18}/> Reorder All via 1mg</button>
              </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {medications.map(med => {
                const percentLeft = (med.remaining_pills / med.total_pills) * 100;
                
                // NEW LOGIC: Calculate days left based on frequency. Default to 1 pill/day if unparseable.
                const freqMatch = String(med.frequency).match(/\d+/);
                const dailyPills = freqMatch ? parseInt(freqMatch[0]) : 1;
                const daysLeft = med.remaining_pills / dailyPills;
                const isLow = daysLeft <= 5;
                
                const isExpiring = new Date(med.expiry_date) <= new Date(new Date().setDate(new Date().getDate() + 30));

                return (
                  <div key={med.id} className={`bg-white rounded-[32px] border ${isLow || isExpiring ? 'border-red-200 shadow-red-50' : 'border-slate-100'} p-8 shadow-xl flex flex-col justify-between group`}>
                    
                    {/* Header */}
                    <div className="mb-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className={`p-3 rounded-2xl ${isLow ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'} `}>
                          <Pill size={24}/>
                        </div>
                        <div className="flex gap-2 items-center">
                          {(isLow || isExpiring) && (
                             <span className="flex items-center gap-1 text-[10px] uppercase font-black tracking-widest text-red-500 bg-red-50 px-3 py-1.5 rounded-full"><AlertOctagon size={12}/> {isExpiring ? "Expiring Soon" : `${Math.floor(daysLeft)} Days Left`}</span>
                          )}
                          <button onClick={() => setMedications(medications.filter(m => m.id !== med.id))} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={16}/></button>
                        </div>
                      </div>
                      <h3 className="serif text-3xl text-slate-900 mb-1">{med.name}</h3>
                      <p className="text-sm font-bold text-slate-400">{med.dosage} • {med.frequency}</p>
                    </div>

                    {/* Progress Bar (Inventory) */}
                    <div className="mb-6">
                      <div className="flex justify-between text-xs font-bold mb-2">
                         <span className="text-slate-500">Inventory</span>
                         <span className={isLow ? 'text-red-500' : 'text-slate-700'}>{med.remaining_pills} / {med.total_pills} left</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5 mb-1 overflow-hidden">
                         <div className={`h-2.5 rounded-full ${isLow ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${Math.max(percentLeft, 5)}%` }}></div>
                      </div>
                    </div>

                    {/* Expiry Details */}
                    <div className="flex items-center gap-2 mb-6 text-xs font-bold text-slate-400">
                      <CalendarDays size={14}/> Expires: <span className={isExpiring ? 'text-red-500': ''}>{new Date(med.expiry_date).toLocaleDateString()}</span>
                    </div>

                    {/* Multi-Pharmacy Compare & Action */}
                    <div className="space-y-2 mt-auto pt-6 border-t border-slate-100">
                        <p className={`text-[10px] font-black uppercase tracking-widest text-center mb-2 ${isLow || isExpiring ? 'text-red-500' : 'text-slate-400'}`}>Compare Prices & Refill</p>
                        
                        {(isLow || isExpiring) && !med.refill_requested && (
                          <button 
                            onClick={() => {
                              const updated = medications.map(m => m.id === med.id ? { ...m, refill_requested: true } : m);
                              setMedications(updated);
                              alert("Refill Request sent to your Doctor's Dashboard!");
                            }}
                            className="w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 bg-slate-900 border border-slate-900 text-white hover:bg-slate-800 shadow-xl transition-all mb-2"
                          >
                            <Send size={14}/> Notify Doctor for Rx Refill
                          </button>
                        )}
                        {(isLow || isExpiring) && med.refill_requested && (
                          <div className="w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-100 mb-2">
                             <CheckCircle size={14}/> Rx Request Sent
                          </div>
                        )}

                        <a href={`https://www.1mg.com/search/all?name=${med.name}`} target="_blank" rel="noreferrer" className="w-full py-3 rounded-xl font-bold text-xs flex items-center justify-between px-4 bg-red-50 border border-red-100 text-red-700 hover:bg-red-600 hover:text-white transition-all">
                            Tata 1mg <ExternalLink size={14}/>
                        </a>
                        <a href={`https://pharmeasy.in/search/all?name=${med.name}`} target="_blank" rel="noreferrer" className="w-full py-3 rounded-xl font-bold text-xs flex items-center justify-between px-4 bg-teal-50 border border-teal-100 text-teal-700 hover:bg-teal-600 hover:text-white transition-all">
                            PharmEasy <ExternalLink size={14}/>
                        </a>
                        <a href={`https://www.apollopharmacy.in/search-medicines/${med.name}`} target="_blank" rel="noreferrer" className="w-full py-3 rounded-xl font-bold text-xs flex items-center justify-between px-4 bg-blue-50 border border-blue-100 text-blue-700 hover:bg-blue-600 hover:text-white transition-all">
                            Apollo Pharmacy <ExternalLink size={14}/>
                        </a>
                    </div>
                  </div>
                );
              })}
              
              {/* Add New Card Placeholder */}
              <button onClick={() => setShowAddMedModal(true)} className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[32px] p-8 flex flex-col items-center justify-center text-slate-400 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all min-h-[300px]">
                <div className="bg-white p-4 rounded-full shadow-sm mb-4"><Pill size={32}/></div>
                <span className="font-bold">Add Prescription</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Add Prescription Modal */}
      {showAddMedModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] p-8 md:p-12 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-8">
              <h3 className="serif text-4xl text-slate-900">Add Medicine</h3>
              <button onClick={() => setShowAddMedModal(false)} className="bg-slate-100 p-3 rounded-full text-slate-500 hover:bg-slate-200"><X size={20}/></button>
            </div>
            
            {/* AI Pill Scanner */}
            <div className="mb-6 bg-blue-50 border border-blue-100 rounded-3xl p-6">
              <input 
                type="file" 
                accept="image/*" 
                ref={fileInputRef}
                className="hidden" 
                onChange={async (e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  
                  setScanningPill(true);
                  const reader = new FileReader();
                  reader.onload = async () => {
                    const base64Image = reader.result;
                    try {
                      const res = await fetch("http://localhost:5000/recognize_pill", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ image: base64Image })
                      });
                      const result = await res.json();
                      if (result.success && result.data) {
                        setNewMed(prev => ({
                          ...prev,
                          name: result.data.name || prev.name,
                          dosage: result.data.dosage || prev.dosage,
                          frequency: result.data.frequency || prev.frequency
                        }));
                      } else {
                        alert("AI could not read the pill label clearly. Try again.");
                      }
                    } catch (error) {
                      console.error(error);
                      alert("Error recognizing pill.");
                    } finally {
                      setScanningPill(false);
                      fileInputRef.current.value = "";
                    }
                  };
                  reader.readAsDataURL(file);
                }}
              />
              <div className="flex items-center gap-4">
                 <div className="bg-blue-600 text-white p-4 rounded-2xl"><Camera size={24}/></div>
                 <div className="flex-1">
                   <h4 className="font-bold text-slate-800 text-sm mb-1">MedAI Vision Scanner</h4>
                   <p className="text-xs text-slate-500">Upload a picture of your pill box or label and let AI auto-fill the details.</p>
                 </div>
                 <button 
                   onClick={() => fileInputRef.current?.click()}
                   disabled={scanningPill}
                   className="bg-white border-2 border-blue-200 text-blue-600 px-4 py-2 rounded-xl font-bold text-xs hover:bg-blue-600 hover:text-white transition-all shadow-sm flex items-center gap-2"
                 >
                   {scanningPill ? <><RefreshCw size={14} className="animate-spin"/> Scanning...</> : <><UploadCloud size={14}/> Upload</>}
                 </button>
              </div>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();

              // --- DDI CHECK before adding medication ---
              const allMedNames = [...medications.map(m => m.name), newMed.name];
              if (allMedNames.length >= 2) {
                setDdiChecking(true);
                try {
                  const ddiRes = await fetch("http://localhost:5000/check_ddi", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ medications: allMedNames })
                  });
                  const ddiData = await ddiRes.json();
                  if (ddiData.has_interaction && ddiData.warnings.length > 0) {
                    setDdiWarning({ warnings: ddiData.warnings });
                    setDdiChecking(false);
                    return; // Stop — show warning banner; user must confirm
                  }
                } catch (err) {
                  console.error("DDI check failed:", err);
                  // Non-blocking: proceed if DDI API is unreachable
                } finally {
                  setDdiChecking(false);
                }
              }

              // No interaction (or only 1 drug) — add medication normally
              setMedications([...medications, { id: Date.now(), ...newMed, price_estimate: "TBD", refill_requested: false }]);
              setShowAddMedModal(false);
              setDdiWarning(null);
              setNewMed({ name: '', dosage: '', frequency: '1 pill daily', total_pills: '', remaining_pills: '', expiry_date: '' });
            }} className="space-y-6">
              
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Medicine Name</label>
                <input required type="text" value={newMed.name} onChange={e => setNewMed({...newMed, name: e.target.value})} placeholder="e.g. Paracetamol" className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all"/>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Dosage</label>
                  <input required type="text" value={newMed.dosage} onChange={e => setNewMed({...newMed, dosage: e.target.value})} placeholder="e.g. 500mg" className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all"/>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Frequency</label>
                  <input required type="text" value={newMed.frequency} onChange={e => setNewMed({...newMed, frequency: e.target.value})} placeholder="e.g. 2 pills daily" className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all"/>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Total Pills Bought</label>
                  <input required type="number" value={newMed.total_pills} onChange={e => setNewMed({...newMed, total_pills: e.target.value, remaining_pills: e.target.value})} placeholder="e.g. 30" className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all"/>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Expiry Date</label>
                  <input required type="date" value={newMed.expiry_date} onChange={e => setNewMed({...newMed, expiry_date: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all"/>
                </div>
              </div>

              {/* 🚨 DDI Interaction Warning Banner */}
              {ddiWarning && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 animate-in slide-in-from-top-2 duration-300">
                  <div className="flex items-start gap-3 mb-3">
                    <AlertOctagon size={20} className="text-amber-600 shrink-0 mt-0.5"/>
                    <div>
                      <p className="font-black text-sm text-amber-800 uppercase tracking-widest mb-1">Drug Interaction Detected</p>
                      <p className="text-xs text-amber-700 font-medium">The following clinically significant interactions were found between your medications:</p>
                    </div>
                  </div>
                  <ul className="space-y-2 mb-4">
                    {ddiWarning.warnings.map((w, i) => (
                      <li key={i} className="text-xs text-amber-800 bg-amber-100 rounded-xl px-4 py-2.5 font-medium leading-relaxed">
                        ⚠️ {w}
                      </li>
                    ))}
                  </ul>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        // "Add Anyway" — user accepts the risk
                        setMedications([...medications, { id: Date.now(), ...newMed, price_estimate: "TBD", refill_requested: false }]);
                        setShowAddMedModal(false);
                        setDdiWarning(null);
                        setNewMed({ name: '', dosage: '', frequency: '1 pill daily', total_pills: '', remaining_pills: '', expiry_date: '' });
                      }}
                      className="flex-1 bg-amber-600 text-white py-3 rounded-xl font-bold text-xs hover:bg-amber-700 transition-all"
                    >
                      Add Anyway (I Understand the Risk)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDdiWarning(null)}
                      className="flex-1 bg-white border border-slate-200 text-slate-600 py-3 rounded-xl font-bold text-xs hover:bg-slate-50 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <button type="submit" disabled={ddiChecking} className="w-full bg-slate-900 text-white font-bold py-5 rounded-2xl mt-4 hover:bg-blue-600 transition-all shadow-xl shadow-slate-200 disabled:opacity-50 flex justify-center items-center gap-3">
                {ddiChecking ? <><RefreshCw size={18} className="animate-spin"/> Checking Interactions...</> : "Save Prescription"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 🎙️ FLOATING VOICE CHATBOT */}
      <div className="fixed bottom-8 right-8 flex flex-col items-end gap-4" style={{ zIndex: 9999 }}>
        {isChatOpen && (
          <div className="w-80 md:w-96 bg-white rounded-[32px] shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5">
            <div className="bg-slate-900 p-5 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 p-1.5 rounded-lg"><Activity size={16}/></div>
                <span className="serif text-xl">MedAI Voice</span>
              </div>
              <select 
                value={chatLanguage} 
                onChange={(e) => setChatLanguage(e.target.value)}
                className="bg-slate-800 text-[10px] font-black uppercase rounded-lg px-2 py-1 outline-none border-none text-blue-400 cursor-pointer"
              >
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="mr">Marathi</option>
              </select>
            </div>
            <div className="h-80 overflow-y-auto p-5 space-y-4 bg-slate-50/50">
              {chatMessages.map((m, i) => (
                <div key={i} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-4 rounded-2xl text-sm font-medium leading-relaxed ${m.sender === 'user' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-white text-slate-700 shadow-sm border border-slate-100'}`}>
                    {m.text}
                    {m.sender === "bot" && (
                      <button onClick={() => speak(m.text)} className="ml-2 inline-block text-blue-500 hover:text-blue-700">
                        <Volume2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            
            {/* NEW VOICE INPUT AREA */}
            <div className="p-4 bg-white border-t border-slate-100 flex gap-2 items-center">
              <button 
                onClick={startListening}
                className={`p-3 rounded-xl transition-all ${isListening ? "bg-red-100 text-red-600 animate-pulse" : "bg-slate-100 text-slate-600 hover:bg-blue-50"}`}
              >
                {isListening ? <Square size={18} fill="currentColor"/> : <Mic size={18} />}
              </button>
              <input 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleChatSend();
                  }
                }}
                placeholder={isListening ? "Listening..." : "Type or speak..."}
                className="flex-1 bg-slate-50 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              />
              <button onClick={() => handleChatSend()} className="bg-slate-900 text-white p-2.5 rounded-xl hover:bg-blue-600 transition-colors"><Send size={18}/></button>
            </div>
          </div>
        )}
        <button 
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="bg-slate-900 text-white p-5 rounded-3xl shadow-2xl hover:scale-105 transition-all flex items-center gap-3 group"
        >
          {isChatOpen ? <X size={24}/> : <><MessageSquare size={24} className="group-hover:rotate-12 transition-transform"/> <span className="font-bold text-sm">Voice AI</span></>}
        </button>
      </div>
    </div>
  );
};

export default PatientDashboard;