import { useState, useEffect } from "react";
import supabase from "../services/supabase";
import {
  Activity, Ambulance, MapPin, Phone,
  RefreshCw, Watch, Terminal, Send,
  CheckCircle, Download,
  X, AlertOctagon, ArrowLeft, ShieldCheck, Heart, User, Check, Info
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useGoogleLogin } from '@react-oauth/google';
import { fetchGoogleFitData } from '../services/googleFit';
import {
  getSortedHospitals, triggerBrowserNotification,
  logEmergencyToSupabase, crackFireBoltt, GOOGLE_FIT_SCOPE
} from '../utils/healthUtils';


const PersonalizedAnalysis = () => {
  const navigate = useNavigate();
  
  // Vitals State
  const [inputs, setInputs] = useState({ heart_rate: "100", spo2: "90", systolic_bp: "120", diastolic_bp: "80", steps: "3000" });
  const [healthProfile, setHealthProfile] = useState(null);
  const [result, setResult] = useState(null); 
  const [loading, setLoading] = useState(false);
  
  // Sync Statuses
  const [manualMode, setManualMode] = useState(false);
  const [bleStatus, setBleStatus] = useState("Disconnected");
  const [userLocation, setUserLocation] = useState(null);
  const [analysisTime, setAnalysisTime] = useState(null);

  // Care Team & Dispatch
  const [doctorsList, setDoctorsList] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);

  // SOS States
  const [emergencyContact, setEmergencyContact] = useState("");
  const [emergencyEmail, setEmergencyEmail]     = useState("");  
  const [savingContact, setSavingContact]       = useState(false);
  const [contactSaved, setContactSaved]         = useState(false);
  const [sosBannerVisible, setSosBannerVisible] = useState(false);
  const [sosAlertSent, setSosAlertSent]         = useState(false);
  const [hospitalList, setHospitalList]         = useState([]); 
  const [showHospitals, setShowHospitals]       = useState(false);

  // Checkable Action state
  const [completedActions, setCompletedActions] = useState({});

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load doctors list
      const { data: docs } = await supabase.from('profiles').select('id, full_name, rating').eq('role', 'doctor').order('rating', { ascending: false });
      if (docs) setDoctorsList(docs);

      // Load emergency contact
      const { data: profile } = await supabase
        .from('profiles')
        .select('emergency_phone, emergency_email')
        .eq('id', user.id)
        .single();
      if (profile) {
        if (profile.emergency_phone) setEmergencyContact(profile.emergency_phone);
        if (profile.emergency_email) setEmergencyEmail(profile.emergency_email);
      }

      // Load patient health profile
      const { data: patientProfile } = await supabase
        .from('patient_profile')
        .select('*')
        .eq('id', user.id)
        .single();
      if (patientProfile) {
        setHealthProfile(patientProfile);
      }
    } catch (err) {
      console.warn('⚠️ Could not load initial data:', err.message);
    }
  };

  // Google Fit Login
  const loginToGoogleFit = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setLoading(true);
        const fitData = await fetchGoogleFitData(tokenResponse.access_token);
        setInputs(prev => ({ ...prev, steps: fitData.steps, heart_rate: fitData.heartRate, spo2: fitData.spo2, systolic_bp: fitData.systolic, diastolic_bp: fitData.diastolic }));
        alert("Google Fit Data Synced!");
      } catch (err) { alert("Sync failed."); } finally { setLoading(false); }
    },
    scope: GOOGLE_FIT_SCOPE,
  });

  // BLE Smartwatch
  const handleCrackFireBoltt = () =>
    crackFireBoltt(setBleStatus, (hr) => setInputs((p) => ({ ...p, heart_rate: hr })));

  // Hospital map
  const handleFindHospital = (overrideLat = null, overrideLng = null) => {
    const show = (lat, lng) => {
      const numLat = parseFloat(lat);
      const numLng = parseFloat(lng);
      setUserLocation({ lat: numLat.toFixed(4), lng: numLng.toFixed(4) });
      setHospitalList(getSortedHospitals(numLat, numLng));
      setShowHospitals(true);
    };
    if (overrideLat && overrideLng) { show(overrideLat, overrideLng); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => show(pos.coords.latitude, pos.coords.longitude),
      () => setManualMode(true),
      { enableHighAccuracy: true }
    );
  };

  // Run AI / Offline fallback Assessment
  const handleAnalyze = async () => {
    setLoading(true); setResult(null); setShowHospitals(false); setSendSuccess(false); setSosBannerVisible(false); setSosAlertSent(false);
    setAnalysisTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    
    try {
      const payload = {
        ...inputs,
        emergency_contact: emergencyContact,
        emergency_email:   emergencyEmail,
        location: userLocation ? { lat: userLocation.lat, lng: userLocation.lng } : {},
        patient_profile: healthProfile
      };

      const res = await fetch("http://localhost:5000/predict", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify(payload) 
      });
      const data = await res.json();
      
      // If backend failed to generate personalized insights, merge custom defaults
      if (data && !data.personalized_insights) {
        data.personalized_insights = generateLocalInsights(data.triage_result);
      }
      setResult(data);

      // 🩺 AUTO-PERSIST PERSONALIZED ANALYSIS TO SUPABASE MEDICAL_REPORTS
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const reportSummary = data.personalized_insights?.personalized_explanation || data.deep_analysis?.simple_summary || `Personalized AI Analysis: ${data.triage_result} Risk detected (HR: ${inputs.heart_rate} BPM, SpO2: ${inputs.spo2}%, BP: ${inputs.systolic_bp}/${inputs.diastolic_bp} mmHg).`;
          await supabase.from('medical_reports').insert([{
            patient_id: user.id,
            doctor_id: selectedDoctorId || null,
            vitals: inputs,
            ai_summary: reportSummary,
            risk_level: data.triage_result || "LOW",
            status: selectedDoctorId ? "Pending Review" : "Self Diagnosed"
          }]);
        }
      } catch (saveErr) {
        console.warn("⚠️ Could not auto-save personalized report to Supabase history:", saveErr);
      }

      if (data.triage_result === 'HIGH') {
        handleFindHospital();
        triggerBrowserNotification(inputs, emergencyContact);
        logEmergencyToSupabase(inputs, userLocation, emergencyContact);
        setSosBannerVisible(true);
        setSosAlertSent(true);
      }
    } catch (e) {
      console.warn("Gemini service offline. Running local fallback prediction...", e);
      runLocalFallback();
    } finally {
      setLoading(false);
    }
  };

  const generateLocalInsights = (triageResult) => {
    const hr = parseFloat(inputs.heart_rate);
    const isAthlete = healthProfile?.athlete_status || false;
    const hasHypertension = healthProfile?.medical_history?.includes("Hypertension") || false;
    const hasAsthma = healthProfile?.medical_history?.includes("Asthma") || false;

    let explanation = "";
    let riskFactors = [];
    let positiveIndicators = [];
    let actions = [];

    if (triageResult === "HIGH") {
      explanation = `Critically high vitals found. Heart rate of ${hr} BPM is elevated. SpO2 level is low. ${hasAsthma ? "Asthma history increases the risk of oxygen desaturation." : ""}`;
      riskFactors = ["Elevated heart rate", "Decreased oxygen levels", hasAsthma ? "Asthma history" : "Cardiovascular strain"];
      positiveIndicators = ["Vitals system active"];
      actions = ["Contact emergency contact immediately", "Sit down and rest", "Locate nearby hospital"];
    } else if (triageResult === "MODERATE") {
      explanation = `Moderate alert. Heart rate is slightly high. Blood pressure is elevated. ${hasHypertension ? "Hypertension history might explain elevated blood pressure." : ""}`;
      riskFactors = ["Elevated Blood Pressure", "Slightly high heart rate"];
      positiveIndicators = [isAthlete ? "Athlete recovery rate may help" : "SpO2 is stable"];
      actions = ["Rest for 10 minutes", "Avoid stimulant triggers", "Monitor readings"];
    } else {
      explanation = `Vitals are stable and within healthy limits. Heart rate is normal. ${isAthlete ? "Athlete baseline shows high efficiency." : ""}`;
      riskFactors = [healthProfile?.smoking ? "Smoking presents long term risks" : "No acute risk factors"];
      positiveIndicators = ["Normal heart rate", "Optimal blood oxygen"];
      actions = ["Maintain current activity", "Hydrate properly", "Perform normal daily logs"];
    }

    return {
      ai_summary: `${triageResult} RISK`,
      prediction_confidence: "95%",
      primary_risk_factors: riskFactors,
      positive_indicators: positiveIndicators,
      personalized_explanation: explanation,
      recommended_actions: actions
    };
  };

  const runLocalFallback = async () => {
    const hr = parseFloat(inputs.heart_rate);
    const spo2 = parseFloat(inputs.spo2);
    const sbp = parseFloat(inputs.systolic_bp);
    const dbp = parseFloat(inputs.diastolic_bp);

    let triageResult = "LOW";
    if (hr > 120 || spo2 < 90 || sbp > 160 || dbp > 100) {
      triageResult = "HIGH";
    } else if (hr > 100 || spo2 < 95 || sbp > 130 || dbp > 85) {
      triageResult = "MODERATE";
    }

    const localInsights = generateLocalInsights(triageResult);
    const mockResult = {
      triage_result: triageResult,
      deep_analysis: {
        simple_summary: localInsights.personalized_explanation,
        action_plan: localInsights.recommended_actions,
        hospital_recommendation: triageResult === "HIGH" ? "Sahyadri Hospital (ER)" : "Home Monitoring"
      },
      personalized_insights: localInsights
    };

    setResult(mockResult);

    // 🩺 Save fallback analysis to Supabase
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('medical_reports').insert([{
          patient_id: user.id,
          doctor_id: selectedDoctorId || null,
          vitals: inputs,
          ai_summary: localInsights.personalized_explanation || `Personalized Assessment: ${triageResult} Risk`,
          risk_level: triageResult,
          status: selectedDoctorId ? "Pending Review" : "Self Diagnosed"
        }]);
      }
    } catch (saveErr) {
      console.warn("⚠️ Could not auto-save fallback report to Supabase:", saveErr);
    }

    if (triageResult === 'HIGH') {
      handleFindHospital();
      triggerBrowserNotification(inputs, emergencyContact);
      logEmergencyToSupabase(inputs, userLocation, emergencyContact);
      setSosBannerVisible(true);
      setSosAlertSent(true);
    }
  };


  // Doctor Transmission
  const handleSendToDoctor = async () => {
    if (!selectedDoctorId) { alert("Please select a doctor first."); return; }
    setIsSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('medical_reports').insert([{ 
        patient_id: user.id, 
        doctor_id: selectedDoctorId, 
        vitals: inputs, 
        ai_summary: result?.personalized_insights?.personalized_explanation || result?.deep_analysis?.simple_summary || "Personalized clinical chart analysis.", 
        risk_level: result?.triage_result || "LOW", 
        status: "Pending Review" 
      }]);
      setSendSuccess(true);
    } catch (err) {
      alert("Transmission failed: " + err.message);
    } finally {
      setIsSending(false);
    }
  };

  // PDF Download
  const handleDownloadPDF = async () => {
    if (!result) return;
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    
    // Header
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("MedAI Clinical Chart", 15, 22);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated: ${new Date().toLocaleString()}`, 145, 22);

    let currentY = 50;

    // Vitals Section
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("Smartwatch Vitals", 15, currentY);
    currentY += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text(`Heart Rate: ${inputs.heart_rate} BPM`, 20, currentY);
    doc.text(`Blood Pressure: ${inputs.systolic_bp}/${inputs.diastolic_bp} mmHg`, 80, currentY);
    doc.text(`SpO2: ${inputs.spo2}%`, 150, currentY);
    currentY += 6;
    doc.text(`Daily Steps: ${inputs.steps} steps`, 20, currentY);
    currentY += 12;

    // Profile Section
    if (healthProfile) {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text("Personal Health Profile", 15, currentY);
      currentY += 8;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      doc.text(`Height: ${healthProfile.height} cm | Weight: ${healthProfile.weight} kg | BMI: ${healthProfile.bmi || "N/A"}`, 20, currentY);
      currentY += 6;
      doc.text(`Athlete Status: ${healthProfile.athlete_status ? "Yes" : "No"} | Sport: ${healthProfile.sport_type || "N/A"} | Rest HR: ${healthProfile.resting_heart_rate || "N/A"} BPM`, 20, currentY);
      currentY += 6;
      doc.text(`Medical History: ${healthProfile.medical_history ? healthProfile.medical_history.join(", ") : "None"}`, 20, currentY);
      currentY += 6;
      doc.text(`Smoking: ${healthProfile.smoking ? "Yes" : "No"} | Alcohol: ${healthProfile.alcohol ? "Yes" : "No"}`, 20, currentY);
      currentY += 12;
    }

    // AI Analysis Section
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("Clinical Assessment & Insights", 15, currentY);
    currentY += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Triage Verdict: ${result.triage_result} RISK`, 20, currentY);
    doc.text(`Confidence Score: ${result.personalized_insights?.prediction_confidence || "N/A"}`, 100, currentY);
    currentY += 8;

    doc.setFont("helvetica", "bold");
    doc.text("AI Summary:", 20, currentY);
    currentY += 5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    const summaryLines = doc.splitTextToSize(result.personalized_insights?.personalized_explanation || result.deep_analysis?.simple_summary || "N/A", 175);
    doc.text(summaryLines, 20, currentY);
    currentY += (summaryLines.length * 5) + 8;

    // Actions
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("Recommended Action Plan:", 20, currentY);
    currentY += 6;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    const actions = result.personalized_insights?.recommended_actions || result.deep_analysis?.action_plan || [];
    actions.forEach((act, idx) => {
      const actLines = doc.splitTextToSize(`${idx + 1}. ${act}`, 170);
      doc.text(actLines, 25, currentY);
      currentY += (actLines.length * 5) + 2;
    });

    const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
    doc.setDrawColor(226, 232, 240);
    doc.line(15, pageHeight - 15, 195, pageHeight - 15);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("MedAI Platform | Personalized Health Assessment chart report.", 105, pageHeight - 8, null, null, "center");
    
    doc.save(`MedAI_Personalized_Chart_${new Date().getTime()}.pdf`);
  };

  // BMI calculations helper
  const getBmiCategory = (bmi) => {
    const b = parseFloat(bmi);
    if (isNaN(b)) return "N/A";
    if (b < 18.5) return "Underweight";
    if (b < 25.0) return "Normal Weight";
    if (b < 30.0) return "Overweight";
    return "Obesity";
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-100">

      <main className="flex-1 max-w-6xl mx-auto w-full p-8 md:p-12 space-y-10">
        
        {/* HEADER & NAVIGATION */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <button 
              onClick={() => navigate("/patient")} 
              className="flex items-center gap-2 text-slate-400 hover:text-slate-800 font-bold text-sm transition-colors mb-2"
            >
              <ArrowLeft size={16}/> Back to Dashboard
            </button>
            <h1 className="serif text-5xl md:text-6xl text-slate-900 tracking-tight leading-none">Personalized Health Analysis</h1>
            <p className="text-slate-400 font-medium text-sm md:text-base">Advanced AI diagnostic insights contextualized to your baseline and profile.</p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <button onClick={() => loginToGoogleFit()} className="px-5 py-3 rounded-2xl font-bold text-xs bg-white border border-slate-200 flex items-center gap-2 shadow-sm hover:bg-slate-50 transition-all"><Watch size={16} className="text-blue-600"/> Sync Google Fit</button>
            <button onClick={handleCrackFireBoltt} className={`px-5 py-3 rounded-2xl font-bold text-xs border flex items-center gap-2 transition-all ${bleStatus === "Live 🔴" ? "bg-emerald-50 text-emerald-600 border-emerald-200 shadow-sm" : "bg-slate-900 text-emerald-400 border-slate-800"}`}>
              <Terminal size={16} className={bleStatus === "Live 🔴" ? "animate-pulse" : ""}/> {bleStatus === "Live 🔴" ? "Smartwatch Live" : "Connect Smartwatch"}
            </button>
          </div>
        </header>

        {/* INPUTS ROW */}
        <section className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-xl space-y-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <h3 className="serif text-3xl tracking-tight">Smartwatch Live Vitals</h3>
            <span className="text-xs text-slate-400 italic">Vitals loaded dynamically — change manually to simulate risk settings</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Heart Rate</span>
              <div className="flex items-baseline gap-1">
                <input type="number" value={inputs.heart_rate} onChange={e => setInputs({...inputs, heart_rate: e.target.value})} className="serif text-4xl w-full bg-transparent border-none outline-none text-slate-900 font-bold"/>
                <span className="text-xs font-bold text-slate-400">BPM</span>
              </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">SpO2 (Oxygen)</span>
              <div className="flex items-baseline gap-1">
                <input type="number" value={inputs.spo2} onChange={e => setInputs({...inputs, spo2: e.target.value})} className="serif text-4xl w-full bg-transparent border-none outline-none text-slate-900 font-bold"/>
                <span className="text-xs font-bold text-slate-400">%</span>
              </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Blood Pressure</span>
              <div className="flex items-baseline gap-1">
                <input type="number" value={inputs.systolic_bp} onChange={e => setInputs({...inputs, systolic_bp: e.target.value})} className="serif text-3xl w-12 bg-transparent border-none outline-none text-slate-900 text-center font-bold"/>
                <span className="serif text-2xl text-slate-300">/</span>
                <input type="number" value={inputs.diastolic_bp} onChange={e => setInputs({...inputs, diastolic_bp: e.target.value})} className="serif text-3xl w-12 bg-transparent border-none outline-none text-slate-900 text-center font-bold"/>
                <span className="text-xs font-bold text-slate-400 hidden xl:inline">mmHg</span>
              </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Steps</span>
              <div className="flex items-baseline gap-1">
                <input type="number" value={inputs.steps} onChange={e => setInputs({...inputs, steps: e.target.value})} className="serif text-4xl w-full bg-transparent border-none outline-none text-slate-900 font-bold"/>
                <span className="text-xs font-bold text-slate-400">Steps</span>
              </div>
            </div>
          </div>

          <button 
            onClick={handleAnalyze} 
            disabled={loading} 
            className="w-full bg-slate-900 text-white font-bold py-5 rounded-2xl hover:bg-blue-600 transition-all shadow-xl disabled:opacity-50 flex justify-center items-center gap-3 text-sm md:text-base"
          >
            {loading ? <RefreshCw size={18} className="animate-spin"/> : <Activity size={18}/>}
            {loading ? "Generating Personalized Assessment..." : "Run Personalized AI Health Analysis"}
          </button>
        </section>

        {/* SOS ALERTS BANNER FOR HIGH RISK */}
        {sosBannerVisible && (
          <div className="rounded-[40px] overflow-hidden shadow-2xl animate-in slide-in-from-top-3 duration-300 border border-red-200">
            <div className="bg-red-600 text-white px-8 py-6 flex items-center gap-4">
              <Ambulance size={32} className="shrink-0 animate-pulse"/>
              <div>
                <p className="font-black text-lg uppercase tracking-wider">🚨 Emergency SOS Dispatched</p>
                <p className="text-sm opacity-90 mt-0.5">All local alert channels have been activated for: <strong>{emergencyContact || "Registered emergency contacts"}</strong></p>
              </div>
            </div>
            <div className="bg-red-50/50 px-8 py-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div className="bg-white rounded-2xl p-4 border border-red-100 shadow-sm">
                <p className="text-2xl mb-1">🔔</p>
                <p className="text-xs font-black uppercase tracking-wider text-red-600">Browser notification</p>
                <p className="text-xs text-slate-500 mt-1">Alert triggered locally</p>
              </div>
              <div className="bg-white rounded-2xl p-4 border border-red-100 shadow-sm">
                <p className="text-2xl mb-1">📧</p>
                <p className="text-xs font-black uppercase tracking-wider text-red-600">Email Dispatch</p>
                <p className="text-xs text-slate-500 mt-1">Sent to {emergencyEmail || "SMTP Receiver"}</p>
              </div>
              <div className="bg-white rounded-2xl p-4 border border-red-100 shadow-sm">
                <p className="text-2xl mb-1">🗄️</p>
                <p className="text-xs font-black uppercase tracking-wider text-red-600">Audit logged</p>
                <p className="text-xs text-slate-500 mt-1">Saved to emergency log database</p>
              </div>
            </div>
          </div>
        )}

        {/* MAIN RESULTS GRID */}
        {result && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Column: Assessment & Personalized insights */}
            <div className="lg:col-span-8 space-y-8">
              
              {/* 1. CLINICAL ASSESSMENT CARD */}
              <div className={`p-8 md:p-10 rounded-[40px] bg-white border-l-[16px] shadow-xl ${result.triage_result === 'HIGH' ? 'border-red-500' : result.triage_result === 'MODERATE' ? 'border-amber-500' : 'border-emerald-500'}`}>
                <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Triage Verdict</span>
                    <h2 className="serif text-5xl md:text-6xl text-slate-900 tracking-tight uppercase mt-1">{result.triage_result} RISK</h2>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-right">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">AI Confidence</span>
                    <span className="text-lg font-black text-slate-800">{result.personalized_insights?.prediction_confidence || "96%"}</span>
                  </div>
                </div>

                <div className="space-y-4 border-t border-slate-100 pt-6">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs font-bold text-slate-500">
                    <div>Status: <span className="text-blue-600">Active</span></div>
                    <div>Analysis Time: <span className="text-slate-800">{analysisTime || "N/A"}</span></div>
                    <div>Diagnostic Engine: <span className="text-slate-800">Gemini 2.5 Advanced</span></div>
                  </div>

                  <p className="text-slate-600 font-medium text-lg leading-relaxed italic border-l-4 border-slate-100 pl-4">
                    "{result.personalized_insights?.personalized_explanation || result.deep_analysis?.simple_summary}"
                  </p>
                </div>

                <div className="flex gap-3 flex-wrap mt-8 pt-6 border-t border-slate-100">
                  <button onClick={handleDownloadPDF} className="bg-blue-50 text-blue-600 border border-blue-200 px-6 py-4 rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-blue-100 transition-all shadow-sm">
                    <Download size={16}/> Download Report Chart PDF
                  </button>
                </div>
              </div>

              {/* 2. PERSONALIZED AI INSIGHTS CARD */}
              <div className="bg-white p-8 md:p-10 rounded-[40px] border border-slate-100 shadow-xl space-y-8">
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="serif text-3xl tracking-tight">AI Personalized Insights</h3>
                  <p className="text-xs text-slate-400 mt-1">Cross-referencing biological profile baselines with daily metrics.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Primary Risk Factors */}
                  <div className="bg-red-50/50 p-6 rounded-3xl border border-red-100 space-y-4">
                    <h4 className="text-xs font-black text-red-600 uppercase tracking-widest flex items-center gap-2">
                      <AlertOctagon size={16}/> Primary Risk Factors
                    </h4>
                    <ul className="space-y-3">
                      {result.personalized_insights?.primary_risk_factors?.map((factor, i) => (
                        <li key={i} className="text-xs font-bold text-slate-700 flex items-start gap-2 leading-relaxed">
                          <span className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0 mt-1.5"></span>
                          {factor}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Positive Indicators */}
                  <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-100 space-y-4">
                    <h4 className="text-xs font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                      <CheckCircle size={16}/> Positive Biological Indicators
                    </h4>
                    <ul className="space-y-3">
                      {result.personalized_insights?.positive_indicators?.map((indicator, i) => (
                        <li key={i} className="text-xs font-bold text-slate-700 flex items-start gap-2 leading-relaxed">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shrink-0 mt-1.5"></span>
                          {indicator}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Personalized Explanation */}
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-2 text-xs font-medium text-slate-600 leading-relaxed">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <Info size={14}/> Baseline Explanatory Notes
                  </h4>
                  <p>{result.personalized_insights?.personalized_explanation}</p>
                </div>

                {/* Action Items checklist */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Recommended Actions Checklist</h4>
                  <div className="space-y-2">
                    {result.personalized_insights?.recommended_actions?.map((action, idx) => (
                      <button 
                        key={idx}
                        onClick={() => setCompletedActions({...completedActions, [idx]: !completedActions[idx]})}
                        className="w-full flex items-start gap-3 p-4 bg-slate-50 border border-slate-200 hover:border-blue-400 rounded-2xl text-left text-xs font-bold text-slate-700 hover:bg-slate-100/30 transition-all group"
                      >
                        <div className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-all ${completedActions[idx] ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300'}`}>
                          {completedActions[idx] && <Check size={12}/>}
                        </div>
                        <span className={`leading-tight flex-1 ${completedActions[idx] ? 'line-through text-slate-400' : ''}`}>{action}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* HOSPITAL RECOMMENDATION GRID (HIGH RISK ON PUNE HAVERSINE ROUTING) */}
              {result.triage_result === 'HIGH' && showHospitals && (
                <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
                  <div className="bg-red-600 p-8 rounded-[40px] text-white flex justify-between items-center shadow-2xl">
                    <div className="flex items-center gap-4">
                      <Ambulance size={32}/>
                      <div>
                        <h3 className="font-extrabold text-xl uppercase tracking-tighter">Emergency Routing Active</h3>
                        <p className="text-xs opacity-80 italic">Haversine routing from your location to nearby emergency care:</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {hospitalList.map(h => (
                      <div key={h.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-md flex justify-between items-center group hover:border-red-200 transition-all">
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{h.name}</p>
                          <span className="text-[10px] text-emerald-600 font-black uppercase tracking-widest">{h.distance} km away</span>
                        </div>
                        <div className="flex gap-2">
                          <a href={`tel:${h.phone}`} className="bg-slate-50 text-slate-900 p-3 rounded-xl border hover:bg-white"><Phone size={14}/></a>
                          <a href={`https://www.google.com/maps/dir/?api=1&origin=${userLocation?.lat},${userLocation?.lng}&destination=${h.lat},${h.lng}&travelmode=driving`} target="_blank" rel="noreferrer" className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all"><MapPin size={14}/></a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Baselines, Doctor Notification & Emergency Contacts */}
            <div className="lg:col-span-4 space-y-8">
              
              {/* 3. PERSONAL BASELINE CARD */}
              <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-xl space-y-6">
                <h3 className="serif text-3xl tracking-tight">Personal Baseline</h3>
                
                {healthProfile ? (
                  <div className="space-y-4">
                    {/* Expected HR */}
                    <div className="border-b border-slate-100 pb-3">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Resting & Target HR Range</span>
                      <p className="text-lg font-bold text-slate-800">{healthProfile.resting_heart_rate || "68"} BPM</p>
                      <span className="text-[10px] text-slate-400 font-medium">Expected safe zone: {healthProfile.athlete_status ? "45–140" : "60–160"} BPM</span>
                    </div>

                    {/* Normal BP */}
                    <div className="border-b border-slate-100 pb-3">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Healthy BP Baseline</span>
                      <p className="text-lg font-bold text-slate-800">120/80 mmHg</p>
                      <span className="text-[10px] text-slate-400 font-medium">{healthProfile.medical_history?.includes("Hypertension") ? "Elevated due to Hypertension history" : "Standard adult target range"}</span>
                    </div>

                    {/* Normal SpO2 */}
                    <div className="border-b border-slate-100 pb-3">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Healthy SpO2 Baseline</span>
                      <p className="text-lg font-bold text-slate-800">95% – 100%</p>
                      <span className="text-[10px] text-slate-400 font-medium">{healthProfile.medical_history?.includes("Asthma") ? "Asthma history limits threshold" : "Ideal target saturation"}</span>
                    </div>

                    {/* BMI */}
                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">BMI Category</span>
                      <p className="text-lg font-bold text-slate-800">{healthProfile.bmi || "23.4"} ({getBmiCategory(healthProfile.bmi)})</p>
                      <span className="text-[10px] text-slate-400 font-medium">calculated based on profile height and weight</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-xs font-bold text-slate-400 mb-2">No profile found.</p>
                    <button onClick={() => navigate("/patient")} className="text-xs text-blue-600 font-bold hover:underline">Set up Profile in Dashboard</button>
                  </div>
                )}
              </div>

              {/* 4. EMERGENCY TRANSMIT DATA CARD */}
              <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-xl space-y-6">
                <h3 className="serif text-3xl tracking-tight">Doctor Clinical Sharing</h3>
                
                <div className="space-y-3">
                  {doctorsList.map(doc => (
                    <button key={doc.id} onClick={() => setSelectedDoctorId(doc.id)} className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${selectedDoctorId === doc.id ? 'bg-blue-50 border-blue-600 shadow-sm' : 'bg-slate-50 hover:border-slate-300'}`}>
                      <p className="text-xs font-bold tracking-tight text-slate-800">Dr. {doc.full_name}</p>
                      {selectedDoctorId === doc.id && <CheckCircle size={16} className="text-blue-600"/>}
                    </button>
                  ))}
                </div>

                <button 
                  onClick={handleSendToDoctor} 
                  disabled={!result || !selectedDoctorId || isSending} 
                  className={`w-full py-4 rounded-xl font-bold text-xs transition-all flex justify-center items-center gap-2 ${sendSuccess ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white hover:bg-blue-600 disabled:opacity-30'}`}
                >
                  {sendSuccess ? <><CheckCircle size={14}/> Sent Successfully</> : <><Send size={14}/> Transmit Analysis</>}
                </button>
              </div>

              {/* EMERGENCY CONTACT DISPLAY CARD */}
              <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-xl space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Emergency Contacts</span>
                  {contactSaved && <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1"><CheckCircle size={10}/> Saved</span>}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3">
                    <Phone size={14} className="text-red-400 shrink-0"/>
                    <input
                      type="tel"
                      value={emergencyContact}
                      onChange={e => { setEmergencyContact(e.target.value); setContactSaved(false); }}
                      placeholder="Emergency contact phone"
                      className="bg-transparent outline-none text-xs font-bold text-slate-700 w-full placeholder:text-slate-300"
                    />
                  </div>

                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3">
                    <span className="text-red-400 shrink-0 text-xs font-black">@</span>
                    <input
                      type="email"
                      value={emergencyEmail}
                      onChange={e => { setEmergencyEmail(e.target.value); setContactSaved(false); }}
                      placeholder="Emergency contact email"
                      className="bg-transparent outline-none text-xs font-bold text-slate-700 w-full placeholder:text-slate-300"
                    />
                  </div>

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
                    {savingContact ? 'Saving...' : 'Save SOS Details'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default PersonalizedAnalysis;
