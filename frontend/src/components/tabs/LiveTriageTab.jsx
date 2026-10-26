// LiveTriageTab.jsx — AI Vitals Assessment Tab
import { useState } from "react";
import { API_BASE_URL } from "../../apiConfig";
import {
  Activity, Ambulance, MapPin, Phone,
  RefreshCw, HeartPulse, Download,
  CheckCircle, Heart, Dumbbell, Loader2,
  User, Send, ShieldCheck, Edit2, Watch, Terminal,
  Search, Bell, Sparkles, CheckCircle2, ArrowRight,
  Share2, Mail, MessageSquare, AlertCircle, X
} from "lucide-react";
import supabase from "../../services/supabase";

// ── SVG Sparkline Decorative Curves ──────────────────────────
const Sparkline = ({ type = "heart", color = "#007F73" }) => {
  if (type === "heart") {
    return (
      <svg className="w-16 h-8 overflow-visible" viewBox="0 0 60 25" fill="none">
        <path
          d="M0 15 L10 15 L14 8 L18 22 L23 3 L28 18 L32 12 L36 15 L60 15"
          stroke={color}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (type === "spo2") {
    return (
      <svg className="w-16 h-8 overflow-visible" viewBox="0 0 60 25" fill="none">
        <path
          d="M0 12 Q 10 5, 20 12 T 40 12 T 60 12"
          stroke={color}
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (type === "bp") {
    return (
      <svg className="w-12 sm:w-16 h-8 overflow-visible" viewBox="0 0 60 25" fill="none">
        <path
          d="M0 16 L12 16 L16 10 L20 19 L25 14 L30 16 L60 16"
          stroke={color}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  // steps / activity
  return (
    <svg className="w-16 h-8 overflow-visible" viewBox="0 0 60 25" fill="none">
      <path
        d="M0 20 L15 16 L30 18 L45 8 L60 4"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

// ── Reusable vital input card with sparklines & modern palette ────
const VitalCard = ({ label, unit, icon: Icon, iconBg, iconColor, value, onChange, sparklineType, sparklineColor, footer, isCritical }) => (
  <div className={`bg-white p-5 rounded-2xl border transition-all duration-200 group flex flex-col justify-between ${
    isCritical ? 'border-rose-300 bg-rose-50/20 shadow-sm' : 'border-[#DFEBE8] shadow-sm hover:border-[#007F73]/30 hover:shadow-md'
  }`}>
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-1.5">
        <Icon size={15} className={iconColor} />
        <span className="text-xs font-bold text-[#6D807E] font-plus">{label}</span>
      </div>
      {isCritical && (
        <span className="bg-rose-500 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider animate-pulse">
          CRITICAL
        </span>
      )}
    </div>

    <div className="flex items-center justify-between my-1">
      <div className="flex items-baseline gap-1">
        {onChange ? (
          <input
            type="number"
            value={value}
            onChange={onChange}
            className="font-outfit text-3xl font-extrabold w-24 bg-transparent border-none outline-none text-[#173B3A] focus:text-[#007F73]"
          />
        ) : (
          <span className="font-outfit text-3xl font-extrabold text-[#173B3A]">{value}</span>
        )}
        {unit && <span className="text-xs font-bold text-[#94A5A3]">{unit}</span>}
      </div>

      <div className="opacity-80 group-hover:opacity-100 transition-opacity">
        <Sparkline type={sparklineType} color={sparklineColor} />
      </div>
    </div>

    <div className="mt-2 text-[10px] text-[#6D807E] font-semibold border-t border-[#DFEBE8]/60 pt-2 flex justify-between">
      {footer}
    </div>
  </div>
);

const LiveTriageTab = ({
  userInfo = { fullName: "Patient", firstName: "Patient", initials: "P", patientId: "#4829" },
  patientName,
  inputs, setInputs,
  result, loading,
  hospitalList, showHospitals,
  userLocation, manualMode, setManualMode,
  sosBannerVisible,
  emergencyContactName, setEmergencyContactName,
  emergencyContact, emergencyEmail, setEmergencyContact, setEmergencyEmail,
  savingContact, setSavingContact, contactSaved, setContactSaved,
  doctorsList, selectedDoctorId, setSelectedDoctorId,
  isSending, sendSuccess,
  handleAnalyze, handleSendToDoctor, handleFindHospital,
  loginToGoogleFit, handleCrackFireBoltt, bleStatus
}) => {
  const displayName = userInfo?.fullName || patientName || "Patient";
  const displayFirstName = userInfo?.firstName || (patientName ? patientName.split(" ")[0] : "Patient");
  const displayInitials = userInfo?.initials || "P";
  const displayPatientId = userInfo?.patientId || "#4829";

  // Lazy-load jsPDF only when user clicks Download
  const handleDownloadPDF = async () => {
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    let y = 0;
    doc.setFillColor(0, 127, 115);
    doc.rect(0, 0, 210, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("MedAI Clinical Triage Report", 15, 22);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 15, 29);
    y = 45;
    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(252, 165, 165);
    doc.roundedRect(15, y, 180, 12, 2, 2, 'FD');
    doc.setTextColor(220, 38, 38);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("WARNING: AI-GENERATED PRELIMINARY REPORT - REQUIRES PHYSICIAN VERIFICATION", 20, y + 8);
    y += 25;
    doc.setTextColor(23, 59, 58);
    doc.setFontSize(16);
    doc.text("Patient Vitals Snapshot", 15, y);
    y += 5;
    doc.setDrawColor(223, 235, 232);
    doc.setFillColor(242, 250, 248);
    doc.roundedRect(15, y, 180, 25, 2, 2, 'FD');
    doc.setFontSize(11);
    doc.setTextColor(109, 128, 126);
    doc.text("Heart Rate:", 20, y + 10);
    doc.text("SpO2 (Oxygen):", 110, y + 10);
    doc.text("Blood Pressure:", 20, y + 20);
    doc.text("Activity:", 110, y + 20);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(23, 59, 58);
    doc.text(`${inputs.heart_rate} BPM`, 48, y + 10);
    doc.text(`${inputs.spo2}%`, 142, y + 10);
    doc.text(`${inputs.systolic_bp} / ${inputs.diastolic_bp} mmHg`, 52, y + 20);
    doc.text(`${inputs.steps} Steps`, 128, y + 20);
    y += 40;
    if (result) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("Diagnostic Analysis", 15, y);
      y += 6;
      if (result.triage_result === "HIGH") doc.setFillColor(239, 68, 68);
      else if (result.triage_result === "LOW") doc.setFillColor(22, 160, 133);
      else doc.setFillColor(245, 158, 11);
      doc.roundedRect(15, y, 35, 8, 1, 1, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.text(`${result.triage_result} RISK`, 20, y + 6);
      y += 16;
      doc.setTextColor(23, 59, 58);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("Clinical Summary:", 15, y);
      y += 6;
      doc.setTextColor(109, 128, 126);
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(result.deep_analysis?.simple_summary || "No summary.", 180);
      doc.text(lines, 15, y);
      y += lines.length * 5 + 8;
      doc.setTextColor(23, 59, 58);
      doc.setFont("helvetica", "bold");
      doc.text("Recommended Action Plan:", 15, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(109, 128, 126);
      (result.deep_analysis?.action_plan || []).forEach((action, i) => {
        const al = doc.splitTextToSize(`${i + 1}. ${action}`, 175);
        doc.text(al, 20, y);
        y += al.length * 5 + 2;
      });
    } else {
      doc.setFont("helvetica", "italic");
      doc.setTextColor(148, 165, 163);
      doc.text("AI Analysis not yet performed. Please process vitals first.", 15, y);
    }
    const pageH = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
    doc.setDrawColor(223, 235, 232);
    doc.line(15, pageH - 15, 195, pageH - 15);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(148, 165, 163);
    doc.text("MedAI Platform | Strictly for informational purposes. Not a substitute for professional medical advice.", 105, pageH - 8, null, null, "center");
    doc.save(`MedAI_Clinical_Chart_${Date.now()}.pdf`);
  };

  // ── 📲 CLINICAL REPORT SHARING STATE ──
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareStatus, setShareStatus] = useState(null);
  const [editingContact, setEditingContact] = useState(false);
  const [contactNameInput, setContactNameInput] = useState(emergencyContactName || "");
  const [contactPhoneInput, setContactPhoneInput] = useState(emergencyContact || "");
  const [contactEmailInput, setContactEmailInput] = useState(emergencyEmail || "");

  const handleOpenShareModal = () => {
    setContactNameInput(emergencyContactName || "");
    setContactPhoneInput(emergencyContact || "");
    setContactEmailInput(emergencyEmail || "");
    setShareStatus(null);
    const hasContact = Boolean((emergencyContactName && emergencyContactName.trim()) || (emergencyContact && emergencyContact.trim()) || (emergencyEmail && emergencyEmail.trim()));
    setEditingContact(!hasContact);
    setIsShareModalOpen(true);
  };

  const handleSaveContact = async () => {
    setSavingContact(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('profiles').update({
          emergency_contact_name: emergencyContactName,
          emergency_phone: emergencyContact,
          emergency_email: emergencyEmail,
        }).eq('id', user.id);
      }
      setContactSaved(true);
      return true;
    } catch (err) {
      alert('Could not save: ' + err.message);
      return false;
    } finally {
      setSavingContact(false);
    }
  };

  const handleSaveModalContactAndContinue = async (e) => {
    if (e) e.preventDefault();
    if (!contactNameInput.trim()) {
      setShareStatus({ type: "error", message: "Please enter your loved one's name." });
      return;
    }
    if (!contactPhoneInput.trim() && !contactEmailInput.trim()) {
      setShareStatus({ type: "error", message: "Please add at least one valid delivery method (Email or WhatsApp)." });
      return;
    }
    if (contactEmailInput.trim() && !contactEmailInput.includes("@")) {
      setShareStatus({ type: "error", message: "Please enter a valid email address." });
      return;
    }

    setSavingContact(true);
    setShareStatus(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('profiles').update({
          emergency_contact_name: contactNameInput.trim(),
          emergency_phone: contactPhoneInput.trim(),
          emergency_email: contactEmailInput.trim(),
        }).eq('id', user.id);
      }
      setEmergencyContactName(contactNameInput.trim());
      setEmergencyContact(contactPhoneInput.trim());
      setEmergencyEmail(contactEmailInput.trim());
      setContactSaved(true);
      setEditingContact(false);
      setShareStatus({ type: "info", message: "Emergency contact saved. Ready to share clinical report!" });
    } catch (err) {
      setShareStatus({ type: "error", message: "Could not save contact details: " + err.message });
    } finally {
      setSavingContact(false);
    }
  };

  const handleExecuteShare = async (channelPreference = "auto") => {
    const targetName = emergencyContactName || contactNameInput || "Loved One";
    const targetEmail = emergencyEmail || contactEmailInput;
    const targetPhone = emergencyContact || contactPhoneInput;

    if (!targetEmail && !targetPhone) {
      setShareStatus({ type: "error", message: "No emergency contact found. Please add a contact." });
      setEditingContact(true);
      return;
    }

    setShareLoading(true);
    setShareStatus(null);
    try {
      const payload = {
        patient_name: displayName,
        recipient_name: targetName,
        recipient_email: targetEmail,
        recipient_phone: targetPhone,
        channel: channelPreference,
        report: {
          ...result,
          vitals: result?.vitals || inputs
        }
      };

      const res = await fetch(`${API_BASE_URL}/share-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setShareStatus({
          type: "success",
          message: data.message || `Clinical report sent successfully to ${targetName}.`
        });
      } else {
        setShareStatus({
          type: "error",
          message: data.message || data.error || "We couldn't deliver the report. Please verify details and try again."
        });
      }
    } catch (err) {
      setShareStatus({
        type: "error",
        message: "Unable to reach sharing service. Please ensure the backend is active."
      });
    } finally {
      setShareLoading(false);
    }
  };

  const hrVal = parseInt(inputs.heart_rate);
  const spo2Val = parseInt(inputs.spo2);
  const sysVal = parseInt(inputs.systolic_bp);
  const diaVal = parseInt(inputs.diastolic_bp);
  const isEmergencyActive = (result?.triage_result === 'HIGH' || sosBannerVisible);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* TOP HEADER BAR — Inspired by Reference Screenshots */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-[#DFEBE8] shadow-sm">
        {/* Search input */}
        <div className="flex-1 relative flex items-center">
          <Search size={17} className="absolute left-3.5 text-[#94A5A3]" />
          <input
            type="text"
            placeholder="Search records, insights, or ask MedAI..."
            className="w-full bg-[#F2FAF8] border border-[#DFEBE8] rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold text-[#173B3A] placeholder:text-[#94A5A3] outline-none focus:border-[#007F73] focus:ring-2 focus:ring-[#007F73]/10 transition-all"
          />
        </div>

        {/* Header Action controls & Patient badge */}
        <div className="flex items-center justify-between md:justify-end gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setManualMode(!manualMode)}
              className={`p-2.5 rounded-xl border transition-all shadow-sm ${
                manualMode
                  ? 'bg-[#E8F8F5] border-[#007F73]/30 text-[#007F73]'
                  : 'bg-white border-[#DFEBE8] text-[#6D807E] hover:bg-[#F2FAF8]'
              }`}
              title="Toggle manual GPS coordinates"
            >
              <Edit2 size={15} />
            </button>

            <button
              onClick={() => loginToGoogleFit()}
              className="px-3.5 py-2.5 rounded-xl font-bold text-xs bg-white border border-[#DFEBE8] text-[#173B3A] flex items-center gap-1.5 shadow-sm hover:bg-[#F2FAF8] transition-all"
            >
              <Watch size={15} className="text-[#007F73]" />
              <span className="hidden sm:inline">Sync Fit</span>
            </button>

            <button
              onClick={handleCrackFireBoltt}
              className={`px-3.5 py-2.5 rounded-xl font-bold text-xs border flex items-center gap-1.5 transition-all shadow-sm ${
                bleStatus === "Live 🔴"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-[#173B3A] text-emerald-400 border-[#173B3A] hover:bg-[#00665D]"
              }`}
            >
              <Terminal size={15} className={bleStatus === "Live 🔴" ? "animate-pulse" : ""} />
              <span className="hidden sm:inline">{bleStatus === "Live 🔴" ? "Stream Active" : "Connect Device"}</span>
            </button>
          </div>

          <div className="h-6 w-[1px] bg-[#DFEBE8] hidden md:block" />

          {/* User profile snippet */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-[#173B3A] font-outfit">{displayName}</p>
              <p className="text-[10px] font-semibold text-[#94A5A3]">Patient ID: {displayPatientId}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-[#E8F8F5] border border-[#007F73]/20 text-[#007F73] font-outfit font-extrabold text-xs flex items-center justify-center shadow-sm">
              {displayInitials}
            </div>
          </div>
        </div>
      </div>

      {/* PAGE GREETING / OVERVIEW HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pt-1">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#6D807E]">
            {result ? "Post-Assessment Overview" : "Pre-Assessment Clinical Hub"}
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#173B3A] tracking-tight font-outfit mt-0.5">
            Good morning, {displayFirstName}.
          </h1>
        </div>

        <div className="flex items-center gap-2 bg-white/70 px-3.5 py-1.5 rounded-xl border border-[#DFEBE8] text-[11px] font-semibold text-[#6D807E]">
          <span className="w-2 h-2 rounded-full bg-[#16A085]" />
          <span>Last updated: Just now</span>
        </div>
      </div>

      {/* Manual GPS Form overlay if active */}
      {manualMode && (
        <form onSubmit={(e) => { e.preventDefault(); handleFindHospital(e.target.lat.value, e.target.lng.value); }}
          className="bg-white border border-[#DFEBE8] p-5 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-4 shadow-sm animate-in slide-in-from-top-3 duration-200">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-[#6D807E] block ml-1">Latitude</label>
            <input name="lat" defaultValue="18.5793" required className="w-full bg-[#F2FAF8] border border-[#DFEBE8] px-3.5 py-2 rounded-xl outline-none focus:border-[#007F73] text-xs font-semibold text-[#173B3A]" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-[#6D807E] block ml-1">Longitude</label>
            <input name="lng" defaultValue="73.9806" required className="w-full bg-[#F2FAF8] border border-[#DFEBE8] px-3.5 py-2 rounded-xl outline-none focus:border-[#007F73] text-xs font-semibold text-[#173B3A]" />
          </div>
          <div className="flex items-end">
            <button type="submit" className="w-full bg-[#007F73] hover:bg-[#00665D] text-white py-2 rounded-xl font-bold text-xs shadow-sm transition-all">Set GPS Origin</button>
          </div>
        </form>
      )}

      {/* 4 VITALS METRICS GRID with SVG SPARKLINE WAVEFORMS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <VitalCard
          label="Heart Rate"
          unit="bpm"
          icon={HeartPulse}
          iconColor="text-rose-500"
          value={inputs.heart_rate}
          onChange={e => setInputs({ ...inputs, heart_rate: e.target.value })}
          sparklineType="heart"
          sparklineColor="#F43F5E"
          isCritical={hrVal > 110}
          footer={
            <>
              <span>Normal: 60-100</span>
              <span className={hrVal > 100 ? "text-rose-600 font-bold" : "text-[#16A085]"}>
                {hrVal > 100 ? "Elevated" : "Stable"}
              </span>
            </>
          }
        />

        <VitalCard
          label="Oxygen (SpO2)"
          unit="%"
          icon={Activity}
          iconColor="text-sky-500"
          value={inputs.spo2}
          onChange={e => setInputs({ ...inputs, spo2: e.target.value })}
          sparklineType="spo2"
          sparklineColor="#0EA5E9"
          isCritical={spo2Val < 92}
          footer={
            <>
              <span>Normal: 95-100%</span>
              <span className={spo2Val < 95 ? "text-rose-600 font-bold" : "text-[#16A085]"}>
                {spo2Val < 95 ? "Low SpO2" : "Optimal"}
              </span>
            </>
          }
        />

        {/* BP Card with 2 inputs */}
        <div className={`bg-white p-5 rounded-2xl border transition-all duration-200 group flex flex-col justify-between ${
          sysVal > 140 ? 'border-rose-300 bg-rose-50/20 shadow-sm' : 'border-[#DFEBE8] shadow-sm hover:border-[#007F73]/30 hover:shadow-md'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Heart size={15} className="text-[#007F73]" />
              <span className="text-xs font-bold text-[#6D807E] font-plus">Blood Pressure</span>
            </div>
            {sysVal > 140 && (
              <span className="bg-rose-500 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider animate-pulse">
                HIGH
              </span>
            )}
          </div>
          <div className="flex items-center justify-between my-1 gap-1">
            <div className="flex items-baseline gap-0.5 min-w-0">
              <input
                type="number"
                value={inputs.systolic_bp}
                onChange={e => setInputs({ ...inputs, systolic_bp: e.target.value })}
                className="font-outfit text-2.5xl sm:text-3xl font-extrabold w-[3.4rem] bg-transparent border-none outline-none text-[#173B3A] focus:text-[#007F73] text-center p-0"
              />
              <span className="text-lg sm:text-xl text-[#94A5A3] font-light">/</span>
              <input
                type="number"
                value={inputs.diastolic_bp}
                onChange={e => setInputs({ ...inputs, diastolic_bp: e.target.value })}
                className="font-outfit text-2.5xl sm:text-3xl font-extrabold w-[3.4rem] bg-transparent border-none outline-none text-[#173B3A] focus:text-[#007F73] text-center p-0"
              />
              <span className="text-[10px] sm:text-xs font-bold text-[#94A5A3] shrink-0 ml-0.5">mmHg</span>
            </div>
            <div className="opacity-80 group-hover:opacity-100 transition-opacity shrink-0">
              <Sparkline type="bp" color="#007F73" />
            </div>
          </div>
          <div className="mt-2 text-[10px] text-[#6D807E] font-semibold border-t border-[#DFEBE8]/60 pt-2 flex justify-between">
            <span>Normal: 120/80</span>
            <span className={sysVal > 130 ? "text-rose-600 font-bold" : "text-[#16A085]"}>
              {sysVal > 130 ? "Stage 1" : "Normal"}
            </span>
          </div>
        </div>

        <VitalCard
          label="Steps Today"
          unit=""
          icon={Dumbbell}
          iconColor="text-emerald-500"
          value={inputs.steps}
          onChange={e => setInputs({ ...inputs, steps: e.target.value })}
          sparklineType="steps"
          sparklineColor="#10B981"
          footer={
            <>
              <span>Goal: 10,000</span>
              <span className="text-[#16A085] font-bold">
                {Math.floor((parseInt(inputs.steps || 0) / 10000) * 100)}%
              </span>
            </>
          }
        />
      </div>

      {/* EMERGENCY DISPATCH BANNER — Matching Reference Image 2 style */}
      {isEmergencyActive && (
        <div className="rounded-2xl overflow-hidden shadow-lg border border-rose-300 animate-in slide-in-from-top-4 duration-300 bg-gradient-to-r from-[#D71920] via-[#EF3340] to-[#FF5C78] text-white p-6 md:p-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white border border-white/30">
                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                <span>* EMERGENCY TRIAGE ACTIVATED</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-outfit text-white">
                Emergency SOS Dispatched
              </h2>
              <p className="text-xs sm:text-sm font-medium text-white/95 leading-relaxed">
                Critical health indicators detected. Stay calm, emergency notification sent to registered contacts and nearest Pune hospital endpoints.
              </p>
            </div>

            <button
              onClick={() => {
                const el = document.getElementById('emergency-contact-input');
                if (el) el.focus();
              }}
              className="bg-white hover:bg-rose-50 text-[#D71920] px-6 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all shrink-0 flex items-center gap-2"
            >
              <Phone size={14} />
              <span>Emergency Contacts</span>
            </button>
          </div>
        </div>
      )}

      {/* MAIN 2-COLUMN SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT / CENTER COLUMN */}
        <div className="lg:col-span-8 space-y-6">

          {/* POST-ASSESSMENT CARD — Inspired by Reference Image 1 */}
          {result ? (
            <div className="bg-white rounded-2xl border border-[#DFEBE8] p-6 sm:p-8 shadow-sm space-y-6">
              
              {/* Header with Risk pill */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#DFEBE8]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#E8F8F5] text-[#007F73] flex items-center justify-center">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <h3 className="font-outfit font-extrabold text-base text-[#173B3A]">AI Health Assessment</h3>
                    <p className="text-[10px] text-[#94A5A3] font-semibold">
                      {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} • {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                <span className={`px-3.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border ${
                  result.triage_result === 'HIGH'
                    ? 'bg-rose-50 border-rose-200 text-rose-600'
                    : 'bg-[#E8F8F5] border-[#007F73]/20 text-[#007F73]'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${result.triage_result === 'HIGH' ? 'bg-rose-500' : 'bg-[#16A085]'}`} />
                  <span>Risk Score: {result.triage_result === 'HIGH' ? 'High' : 'Low'}</span>
                </span>
              </div>

              {/* Verdict title & Clinical Summary */}
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#173B3A] font-outfit tracking-tight mb-2">
                  {result.triage_result === 'HIGH'
                    ? 'Critical Alert — Immediate Medical Action Required'
                    : 'Stable — Continue monitoring'}
                </h2>
                <p className="text-xs sm:text-sm text-[#6D807E] font-medium leading-relaxed bg-[#F2FAF8] p-4 rounded-xl border border-[#DFEBE8]/80">
                  "{result.deep_analysis?.simple_summary || 'Based on your latest biometric inputs and historical data, vitals remain within reference boundaries.'}"
                </p>
              </div>

              {/* 2-Column Findings & Recommended Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                
                {/* Key Findings */}
                <div className="bg-white p-4.5 rounded-xl border border-[#DFEBE8] space-y-3">
                  <h4 className="text-xs font-bold text-[#173B3A] uppercase tracking-wider flex items-center gap-1.5 font-outfit">
                    <CheckCircle2 size={15} className="text-[#007F73]" />
                    <span>Key Findings</span>
                  </h4>
                  <ul className="space-y-2">
                    <li className="text-xs text-[#6D807E] font-semibold flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-[#E8F8F5] text-[#007F73] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">✓</span>
                      <span>Resting HR input stabilized at {inputs.heart_rate} bpm range.</span>
                    </li>
                    <li className="text-xs text-[#6D807E] font-semibold flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-[#E8F8F5] text-[#007F73] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">✓</span>
                      <span>SpO2 oxygen saturation level measured at {inputs.spo2}%.</span>
                    </li>
                    <li className="text-xs text-[#6D807E] font-semibold flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-[#E8F8F5] text-[#007F73] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">✓</span>
                      <span>Blood pressure readings show {inputs.systolic_bp}/{inputs.diastolic_bp} mmHg.</span>
                    </li>
                  </ul>
                </div>

                {/* Recommended Actions */}
                <div className="bg-white p-4.5 rounded-xl border border-[#DFEBE8] space-y-3">
                  <h4 className="text-xs font-bold text-[#173B3A] uppercase tracking-wider flex items-center gap-1.5 font-outfit">
                    <ArrowRight size={15} className="text-[#007F73]" />
                    <span>Recommended Actions</span>
                  </h4>
                  <ul className="space-y-2">
                    {(result.deep_analysis?.action_plan || [
                      "Maintain current hydration protocols (2.5L/day).",
                      "Proceed with scheduled light activity tomorrow.",
                      "Log evening resting vitals before sleep."
                    ]).map((act, i) => (
                      <li key={i} className="text-xs text-[#6D807E] font-semibold flex items-start gap-2">
                        <span className="text-[#007F73] font-bold">•</span>
                        <span>{act}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-[#DFEBE8]">
                <button
                  onClick={handleAnalyze}
                  disabled={loading}
                  className="bg-[#007F73] hover:bg-[#00665D] text-white px-6 py-3 rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition-all disabled:opacity-75"
                >
                  <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
                  <span>Re-Analyze Vitals</span>
                </button>

                <button
                  onClick={handleOpenShareModal}
                  className="bg-[#007F73] hover:bg-[#00665D] text-white px-5 py-3 rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
                >
                  <Share2 size={15} />
                  <span>Share Report</span>
                </button>

                <button
                  onClick={handleDownloadPDF}
                  className="bg-white border border-[#DFEBE8] hover:bg-[#F2FAF8] text-[#173B3A] px-5 py-3 rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
                >
                  <Download size={15} className="text-[#007F73]" />
                  <span>Download Report</span>
                </button>
              </div>
            </div>
          ) : (
            /* PRE-ASSESSMENT CARD — Inspired by Reference pre-state */
            <div className="bg-gradient-to-br from-[#F2FAF8] to-[#E8F8F5] border border-[#DFEBE8] rounded-2xl p-8 text-center shadow-sm flex flex-col items-center justify-center min-h-[380px]">
              <div className="w-16 h-16 rounded-full bg-white text-[#007F73] border border-[#DFEBE8] shadow-sm flex items-center justify-center mb-5 animate-pulse">
                <Activity size={32} strokeWidth={2} />
              </div>
              <h2 className="text-2xl font-extrabold text-[#173B3A] font-outfit tracking-tight mb-2">
                AI Health Assessment & Care Hub
              </h2>
              <p className="text-[#6D807E] font-medium text-xs sm:text-sm max-w-md leading-relaxed mb-8">
                Sync your vitals via Google Fit, connect your smart device, or adjust input numbers above to launch your personalized clinical triage assessment.
              </p>
              <button
                onClick={handleAnalyze}
                disabled={loading}
                className="bg-[#007F73] hover:bg-[#00665D] text-white px-8 py-4 rounded-xl font-extrabold text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2.5 group"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Activity size={18} className="group-hover:rotate-12 transition-transform" />}
                <span>Begin AI Assessment</span>
              </button>
            </div>
          )}

          {/* EMERGENCY ROUTING CARDS (when emergency or hospitals visible) */}
          {result?.triage_result === 'HIGH' && showHospitals && (
            <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-300">
              <div className="bg-[#173B3A] p-5 rounded-2xl text-white flex items-center gap-4 shadow-sm border border-[#173B3A]">
                <Ambulance size={26} className="shrink-0 text-rose-400 animate-bounce" />
                <div>
                  <h3 className="font-extrabold text-sm uppercase tracking-wider font-outfit text-white">Emergency Hospital Routing</h3>
                  <p className="text-xs text-[#94A5A3] mt-0.5">Haversine GPS routing to the nearest emergency departments in Pune.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {hospitalList.map(h => (
                  <div key={h.id} className="bg-white p-5 rounded-2xl border border-[#DFEBE8] shadow-sm flex items-center justify-between hover:border-rose-300 hover:shadow-md transition-all">
                    <div>
                      <p className="text-xs font-extrabold text-[#173B3A] font-outfit">{h.name}</p>
                      <span className="text-[10px] text-[#16A085] font-black uppercase block mt-1">{h.distance} km away</span>
                      <span className="text-[9px] text-[#94A5A3] font-semibold block">{h.type}</span>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <a href={`tel:${h.phone}`} className="bg-[#F2FAF8] p-2.5 rounded-xl border border-[#DFEBE8] text-[#173B3A] hover:bg-rose-50 hover:text-rose-600 transition-all"><Phone size={14} /></a>
                      <a href={`https://www.google.com/maps/dir/?api=1&origin=${userLocation?.lat},${userLocation?.lng}&destination=${h.lat},${h.lng}&travelmode=driving`} target="_blank" rel="noreferrer" className="bg-[#007F73] text-white p-2.5 rounded-xl hover:bg-[#00665D] transition-all"><MapPin size={14} /></a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* RIGHT SIDEBAR COLUMN */}
        <div className="lg:col-span-4 space-y-6">

          {/* Physician selection card */}
          <div className="bg-white p-6 rounded-2xl border border-[#DFEBE8] shadow-sm space-y-4">
            <h3 className="text-xs font-extrabold text-[#173B3A] tracking-wider uppercase font-outfit flex items-center gap-2 pb-3 border-b border-[#DFEBE8]">
              <User size={16} className="text-[#007F73]" />
              <span>Primary Care Physician</span>
            </h3>

            <div className="space-y-2.5">
              {doctorsList.map(doc => (
                <button
                  key={doc.id}
                  onClick={() => setSelectedDoctorId(doc.id)}
                  className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
                    selectedDoctorId === doc.id
                      ? 'bg-[#E8F8F5] border-[#007F73] shadow-sm'
                      : 'bg-white border-[#DFEBE8] hover:border-[#6D807E]/40'
                  }`}
                >
                  <div>
                    <p className="text-xs font-bold text-[#173B3A]">Dr. {doc.full_name}</p>
                    {doc.rating && (
                      <span className="text-[10px] font-black text-amber-600 block mt-0.5">
                        ⭐ {doc.rating.toFixed(1)} / 5.0
                      </span>
                    )}
                  </div>
                  {selectedDoctorId === doc.id ? (
                    <CheckCircle size={16} className="text-[#007F73]" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-[#DFEBE8]" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Emergency SOS Contact configuration */}
          <div className="bg-white border border-[#DFEBE8] rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-[#DFEBE8]">
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#173B3A] font-outfit flex items-center gap-1.5">
                <ShieldCheck size={15} className="text-rose-500" />
                <span>Emergency Contacts</span>
              </h3>
              {contactSaved && (
                <span className="text-[9px] font-bold text-[#16A085] bg-[#E8F8F5] px-2 py-0.5 rounded-full flex items-center gap-0.5 border border-[#16A085]/20">
                  <CheckCircle size={10} /> Saved
                </span>
              )}
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-[#6D807E] uppercase block ml-1">Loved One's Name</label>
                <div className="relative flex items-center bg-[#F2FAF8] border border-[#DFEBE8] rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-[#007F73]/10 focus-within:border-[#007F73] transition-all">
                  <User size={13} className="text-[#94A5A3] absolute left-3" />
                  <input
                    id="emergency-name-input"
                    type="text"
                    value={emergencyContactName}
                    onChange={e => { setEmergencyContactName(e.target.value); setContactSaved(false); }}
                    placeholder="e.g. Rahul / Priya"
                    className="bg-transparent outline-none text-xs font-bold text-[#173B3A] w-full pl-6 placeholder:text-[#94A5A3]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-[#6D807E] uppercase block ml-1">SOS Phone / WhatsApp</label>
                <div className="relative flex items-center bg-[#F2FAF8] border border-[#DFEBE8] rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-[#007F73]/10 focus-within:border-[#007F73] transition-all">
                  <Phone size={13} className="text-[#94A5A3] absolute left-3" />
                  <input
                    id="emergency-contact-input"
                    type="tel"
                    value={emergencyContact}
                    onChange={e => { setEmergencyContact(e.target.value); setContactSaved(false); }}
                    placeholder="Emergency phone / WhatsApp"
                    className="bg-transparent outline-none text-xs font-bold text-[#173B3A] w-full pl-6 placeholder:text-[#94A5A3]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-[#6D807E] uppercase block ml-1">SOS Email Alert</label>
                <div className="relative flex items-center bg-[#F2FAF8] border border-[#DFEBE8] rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-[#007F73]/10 focus-within:border-[#007F73] transition-all">
                  <span className="text-[#94A5A3] absolute left-3 text-xs font-black">@</span>
                  <input
                    id="emergency-email-input"
                    type="email"
                    value={emergencyEmail}
                    onChange={e => { setEmergencyEmail(e.target.value); setContactSaved(false); }}
                    placeholder="Emergency contact email"
                    className="bg-transparent outline-none text-xs font-bold text-[#173B3A] w-full pl-6 placeholder:text-[#94A5A3]"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleSaveContact}
              disabled={savingContact || (!emergencyContactName && !emergencyContact && !emergencyEmail)}
              className="w-full py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider bg-[#173B3A] hover:bg-[#007F73] text-white disabled:opacity-40 transition-all flex items-center justify-center gap-1.5 shadow-sm"
            >
              {savingContact ? <RefreshCw size={12} className="animate-spin" /> : <CheckCircle size={12} />}
              <span>{savingContact ? 'Saving...' : 'Save Emergency Contact'}</span>
            </button>
          </div>

          {/* Transmit to doctor CTA */}
          <button
            onClick={handleSendToDoctor}
            disabled={!result || !selectedDoctorId || isSending}
            className={`w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex justify-center items-center gap-2 shadow-sm ${
              sendSuccess
                ? 'bg-[#16A085] text-white'
                : 'bg-[#007F73] text-white hover:bg-[#00665D] disabled:opacity-40'
            }`}
          >
            {sendSuccess ? (
              <><CheckCircle size={15} /><span>Sent Successfully</span></>
            ) : (
              <><Send size={15} /><span>Transmit Chart Data</span></>
            )}
          </button>

        </div>
      </div>

      {/* 📲 SHARE CLINICAL REPORT MODAL */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-[#DFEBE8] space-y-6 animate-in zoom-in-95 duration-200 relative">
            
            {/* Close Button */}
            <button
              onClick={() => setIsShareModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-[#94A5A3] hover:text-[#173B3A] hover:bg-[#F2FAF8] transition-all"
            >
              <X size={18} />
            </button>

            {/* Header */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E8F8F5] text-[#007F73] text-[10px] font-extrabold uppercase tracking-widest border border-[#007F73]/20 mb-2">
                <Share2 size={12} />
                <span>Report Sharing Protocol</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#173B3A] font-outfit">
                Share Clinical Report
              </h2>
              <p className="text-xs text-[#6D807E] font-medium mt-1">
                Deliver this actual AI-generated assessment to your designated emergency / loved-one contact.
              </p>
            </div>

            {/* STATUS BANNER */}
            {shareStatus && (
              <div className={`p-4 rounded-xl text-xs font-semibold flex items-start gap-3 border ${
                shareStatus.type === "success"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : shareStatus.type === "info"
                    ? "bg-[#E8F8F5] border-[#007F73]/20 text-[#007F73]"
                    : "bg-rose-50 border-rose-200 text-rose-800"
              }`}>
                {shareStatus.type === "success" ? (
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                ) : shareStatus.type === "info" ? (
                  <Sparkles size={16} className="text-[#007F73] shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                )}
                <span>{shareStatus.message}</span>
              </div>
            )}

            {/* MAIN CONTENT AREA: RECIPIENT CARD OR CONTACT FORM */}
            {!editingContact && (emergencyContactName || emergencyContact || emergencyEmail) ? (
              /* RECIPIENT CARD */
              <div className="space-y-4">
                <div className="bg-[#F2FAF8] rounded-2xl p-5 border border-[#DFEBE8] space-y-3">
                  <div className="flex items-center justify-between border-b border-[#DFEBE8] pb-2.5">
                    <span className="text-[10px] font-black uppercase text-[#6D807E] tracking-wider">Designated Recipient</span>
                    <button
                      onClick={() => {
                        setContactNameInput(emergencyContactName || "");
                        setContactPhoneInput(emergencyContact || "");
                        setContactEmailInput(emergencyEmail || "");
                        setEditingContact(true);
                      }}
                      className="text-xs font-bold text-[#007F73] hover:underline flex items-center gap-1"
                    >
                      <Edit2 size={12} />
                      <span>Edit Details</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <p className="text-[10px] font-extrabold uppercase text-[#94A5A3]">Recipient Name</p>
                      <p className="text-sm font-extrabold text-[#173B3A]">{emergencyContactName || "Not specified"}</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <p className="text-[10px] font-extrabold uppercase text-[#94A5A3]">Email Address</p>
                        <p className="text-xs font-bold text-[#173B3A] truncate">{emergencyEmail || "None"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-extrabold uppercase text-[#94A5A3]">WhatsApp / Mobile</p>
                        <p className="text-xs font-bold text-[#173B3A]">{emergencyContact || "None"}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* DELIVERY OPTIONS */}
                <div className="space-y-3 pt-2">
                  <p className="text-xs font-bold text-[#173B3A] uppercase tracking-wider font-outfit">Select Delivery Channel</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      onClick={() => handleExecuteShare("whatsapp")}
                      disabled={shareLoading}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white p-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-40"
                    >
                      {shareLoading ? <Loader2 size={15} className="animate-spin" /> : <MessageSquare size={15} />}
                      <span>Send via WhatsApp</span>
                    </button>

                    <button
                      onClick={() => handleExecuteShare("email")}
                      disabled={shareLoading || !emergencyEmail}
                      className="bg-[#007F73] hover:bg-[#00665D] text-white p-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-40"
                    >
                      {shareLoading ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />}
                      <span>Send via Email</span>
                    </button>
                  </div>

                  <p className="text-[10px] text-[#94A5A3] font-medium text-center">
                    Note: Email is active as production delivery. If WhatsApp is unconfigured, system falls back to Email automatically.
                  </p>
                </div>
              </div>
            ) : (
              /* MISSING OR EDIT CONTACT FORM */
              <form onSubmit={handleSaveModalContactAndContinue} className="space-y-4">
                <div className="bg-amber-50/60 border border-amber-200/70 p-3.5 rounded-xl text-xs font-semibold text-amber-900 flex items-start gap-2.5">
                  <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <span>No emergency contact saved yet. Add a loved one or emergency contact to receive your clinical report.</span>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-[#6D807E] block ml-1">Loved One's Name *</label>
                    <input
                      type="text"
                      required
                      value={contactNameInput}
                      onChange={e => setContactNameInput(e.target.value)}
                      placeholder="e.g. Rahul / Priya"
                      className="w-full bg-[#F2FAF8] border border-[#DFEBE8] px-3.5 py-2.5 rounded-xl outline-none focus:border-[#007F73] text-xs font-bold text-[#173B3A]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-[#6D807E] block ml-1">Email Address</label>
                    <input
                      type="email"
                      value={contactEmailInput}
                      onChange={e => setContactEmailInput(e.target.value)}
                      placeholder="rahul@example.com"
                      className="w-full bg-[#F2FAF8] border border-[#DFEBE8] px-3.5 py-2.5 rounded-xl outline-none focus:border-[#007F73] text-xs font-bold text-[#173B3A]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-[#6D807E] block ml-1">WhatsApp / Mobile Number</label>
                    <input
                      type="tel"
                      value={contactPhoneInput}
                      onChange={e => setContactPhoneInput(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full bg-[#F2FAF8] border border-[#DFEBE8] px-3.5 py-2.5 rounded-xl outline-none focus:border-[#007F73] text-xs font-bold text-[#173B3A]"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  {(emergencyContactName || emergencyContact || emergencyEmail) && (
                    <button
                      type="button"
                      onClick={() => setEditingContact(false)}
                      className="w-1/3 border border-[#DFEBE8] text-[#6D807E] hover:bg-[#F2FAF8] py-3 rounded-xl font-bold text-xs transition-all"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={savingContact}
                    className="flex-1 bg-[#173B3A] hover:bg-[#007F73] text-white py-3 rounded-xl font-bold text-xs shadow-sm transition-all flex justify-center items-center gap-2"
                  >
                    {savingContact ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
                    <span>Save Contact & Continue</span>
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}
    </div>
  );
};

export default LiveTriageTab;
