// LiveTriageTab.jsx — AI Vitals Assessment Tab
// Extracted from PatientDashboard.jsx
import {
  Activity, Ambulance, MapPin, Phone,
  RefreshCw, HeartPulse, Download,
  CheckCircle, Heart, Dumbbell, Loader2,
  User, Send, ShieldCheck, Edit2, Watch, Terminal
} from "lucide-react";
import supabase from "../../services/supabase";

// ── Reusable vital input card ────────────────────────────────
const VitalCard = ({ label, unit, icon: Icon, iconBg, iconColor, value, onChange, footer }) => (
  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between hover:border-slate-200 transition-all duration-200 group">
    <div className="flex items-center justify-between mb-3">
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-outfit">{label}</span>
      <div className={`${iconBg} p-2 rounded-xl group-hover:scale-105 transition-all ${iconColor}`}>
        <Icon size={16} />
      </div>
    </div>
    <div className="flex items-baseline gap-2">
      {onChange ? (
        <input type="number" value={value} onChange={onChange}
          className="font-outfit text-3xl font-extrabold w-full bg-transparent border-none outline-none text-slate-900 focus:text-[#005A51]" />
      ) : value}
      {unit && <span className="text-xs font-bold text-slate-400">{unit}</span>}
    </div>
    <div className="mt-2 text-[10px] text-slate-400 font-semibold border-t border-slate-50 pt-2 flex justify-between">{footer}</div>
  </div>
);

const LiveTriageTab = ({
  inputs, setInputs,
  result, loading,
  hospitalList, showHospitals,
  userLocation, manualMode, setManualMode,
  sosBannerVisible,
  emergencyContact, emergencyEmail, setEmergencyContact, setEmergencyEmail,
  savingContact, setSavingContact, contactSaved, setContactSaved,
  doctorsList, selectedDoctorId, setSelectedDoctorId,
  isSending, sendSuccess,
  handleAnalyze, handleSendToDoctor, handleFindHospital,
  loginToGoogleFit, handleCrackFireBoltt, bleStatus
}) => {

  // Lazy-load jsPDF only when user clicks Download
  const handleDownloadPDF = async () => {
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    let y = 0;
    doc.setFillColor(0, 90, 81);
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
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(16);
    doc.text("Patient Vitals Snapshot", 15, y);
    y += 5;
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(15, y, 180, 25, 2, 2, 'FD');
    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139);
    doc.text("Heart Rate:", 20, y + 10);
    doc.text("SpO2 (Oxygen):", 110, y + 10);
    doc.text("Blood Pressure:", 20, y + 20);
    doc.text("Activity:", 110, y + 20);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
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
      else if (result.triage_result === "LOW") doc.setFillColor(16, 185, 129);
      else doc.setFillColor(245, 158, 11);
      doc.roundedRect(15, y, 35, 8, 1, 1, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.text(`${result.triage_result} RISK`, 20, y + 6);
      y += 16;
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("Clinical Summary:", 15, y);
      y += 6;
      doc.setTextColor(71, 85, 105);
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(result.deep_analysis?.simple_summary || "No summary.", 180);
      doc.text(lines, 15, y);
      y += lines.length * 5 + 8;
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.text("Recommended Action Plan:", 15, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      (result.deep_analysis?.action_plan || []).forEach((action, i) => {
        const al = doc.splitTextToSize(`${i + 1}. ${action}`, 175);
        doc.text(al, 20, y);
        y += al.length * 5 + 2;
      });
    } else {
      doc.setFont("helvetica", "italic");
      doc.setTextColor(148, 163, 184);
      doc.text("AI Analysis not yet performed. Please process vitals first.", 15, y);
    }
    const pageH = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
    doc.setDrawColor(226, 232, 240);
    doc.line(15, pageH - 15, 195, pageH - 15);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("MedAI Platform | Strictly for informational purposes. Not a substitute for professional medical advice.", 105, pageH - 8, null, null, "center");
    doc.save(`MedAI_Clinical_Chart_${Date.now()}.pdf`);
  };

  const handleSaveContact = async () => {
    setSavingContact(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('profiles').update({
          emergency_phone: emergencyContact,
          emergency_email: emergencyEmail,
        }).eq('id', user.id);
      }
      setContactSaved(true);
    } catch (err) {
      alert('Could not save: ' + err.message);
    } finally {
      setSavingContact(false);
    }
  };

  const hrVal = parseInt(inputs.heart_rate);
  const spo2Val = parseInt(inputs.spo2);
  const sysVal = parseInt(inputs.systolic_bp);
  const diaVal = parseInt(inputs.diastolic_bp);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">

      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-100">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-outfit">Live Triage</h1>
          <p className="mt-1 text-slate-500 font-semibold text-sm">Diagnostic analysis & emergency Haversine routing.</p>
        </div>
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <button 
            onClick={() => setManualMode(!manualMode)} 
            className={`p-3.5 rounded-xl border transition-all shadow-sm ${
              manualMode 
                ? 'bg-[#005A51]/5 border-[#005A51]/20 text-[#005A51]' 
                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700'
            }`}
            title="Toggle manual coordinates"
          >
            <Edit2 size={16} />
          </button>
          
          <button 
            onClick={() => loginToGoogleFit()} 
            className="px-5 py-3 rounded-xl font-bold text-sm bg-white border border-slate-200 text-slate-700 flex items-center gap-2 shadow-sm hover:bg-slate-50 transition-all"
          >
            <Watch size={16} className="text-[#005A51]" />
            <span>Sync Fit</span>
          </button>
          
          <button 
            onClick={handleCrackFireBoltt} 
            className={`px-5 py-3 rounded-xl font-bold text-sm border flex items-center gap-2 transition-all shadow-sm ${
              bleStatus === "Live 🔴" 
                ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                : "bg-slate-900 text-emerald-400 border-slate-800 hover:bg-slate-800"
            }`}
          >
            <Terminal size={16} className={bleStatus === "Live 🔴" ? "animate-pulse" : ""} />
            <span>{bleStatus === "Live 🔴" ? "Stream Active" : "Connect Device"}</span>
          </button>
        </div>
      </header>

      {/* Manual GPS Form */}
      {manualMode && (
        <form onSubmit={(e) => { e.preventDefault(); handleFindHospital(e.target.lat.value, e.target.lng.value); }}
          className="bg-slate-50 border border-slate-200/60 p-5 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-4 animate-in slide-in-from-top-4 duration-200">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 block ml-1">Latitude</label>
            <input name="lat" defaultValue="18.5793" required className="w-full bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl outline-none focus:border-[#005A51] focus:ring-2 focus:ring-[#005A51]/10 text-sm font-semibold text-slate-800" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 block ml-1">Longitude</label>
            <input name="lng" defaultValue="73.9806" required className="w-full bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl outline-none focus:border-[#005A51] focus:ring-2 focus:ring-[#005A51]/10 text-sm font-semibold text-slate-800" />
          </div>
          <div className="flex items-end">
            <button type="submit" className="w-full bg-[#005A51] hover:bg-[#004D45] text-white py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all">Set GPS Origin</button>
          </div>
        </form>
      )}

      {/* Vitals Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <VitalCard label="Heart Rate" unit="BPM" icon={HeartPulse} iconBg="bg-rose-50" iconColor="text-rose-500"
          value={inputs.heart_rate} onChange={e => setInputs({ ...inputs, heart_rate: e.target.value })}
          footer={<><span>Normal: 60-100</span><span className={hrVal > 100 || hrVal < 60 ? "text-amber-500 font-bold" : "text-emerald-600"}>{hrVal > 100 ? "Elevated" : hrVal < 60 ? "Bradycardia" : "Normal"}</span></>} />

        <VitalCard label="Oxygen (SpO2)" unit="%" icon={Activity} iconBg="bg-blue-50" iconColor="text-blue-500"
          value={inputs.spo2} onChange={e => setInputs({ ...inputs, spo2: e.target.value })}
          footer={<><span>Normal: 95-100</span><span className={spo2Val < 95 ? "text-rose-500 font-bold" : "text-emerald-600"}>{spo2Val < 95 ? "Low SpO2" : "Normal"}</span></>} />

        {/* BP has two inputs — special case */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between hover:border-slate-200 transition-all duration-200 group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-outfit">Blood Pressure</span>
            <div className="bg-[#005A51]/5 p-2 rounded-xl group-hover:scale-105 transition-all text-[#005A51]"><Heart size={16} /></div>
          </div>
          <div className="flex items-baseline gap-1">
            <input type="number" value={inputs.systolic_bp} onChange={e => setInputs({ ...inputs, systolic_bp: e.target.value })} placeholder="sys"
              className="font-outfit text-3xl font-extrabold w-full bg-transparent border-none outline-none text-slate-900 focus:text-[#005A51] text-center" />
            <span className="text-2xl text-slate-300 font-light">/</span>
            <input type="number" value={inputs.diastolic_bp} onChange={e => setInputs({ ...inputs, diastolic_bp: e.target.value })} placeholder="dia"
              className="font-outfit text-3xl font-extrabold w-full bg-transparent border-none outline-none text-slate-900 focus:text-[#005A51] text-center" />
            <span className="text-[10px] font-bold text-slate-400">mmHg</span>
          </div>
          <div className="mt-2 text-[10px] text-slate-400 font-semibold border-t border-slate-50 pt-2 flex justify-between">
            <span>Normal: 120/80</span>
            <span className={sysVal > 130 || diaVal > 85 ? "text-rose-500 font-bold" : "text-emerald-600"}>{sysVal > 130 ? "Hypertension" : "Normal"}</span>
          </div>
        </div>

        <VitalCard label="Daily Steps" unit="Steps" icon={Dumbbell} iconBg="bg-amber-50" iconColor="text-amber-600"
          value={inputs.steps} onChange={e => setInputs({ ...inputs, steps: e.target.value })}
          footer={<><span>Goal: 10k Steps</span><span className="text-slate-500 font-semibold">{Math.floor((parseInt(inputs.steps) / 10000) * 100)}%</span></>} />
      </div>

      {/* Main 2-col layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          {result ? (
            <>
              <div className={`p-8 rounded-3xl border shadow-sm bg-white transition-all duration-300 ${result.triage_result === 'HIGH' ? 'border-rose-100' : 'border-emerald-100'}`}>
                {sosBannerVisible && (
                  <div className="mb-6 rounded-2xl overflow-hidden shadow-sm border border-rose-200 animate-in slide-in-from-top-3 duration-300">
                    <div className="bg-rose-600 text-white px-5 py-4 flex items-center gap-3">
                      <Ambulance size={20} className="shrink-0 animate-pulse" />
                      <div>
                        <p className="font-extrabold text-sm uppercase tracking-wider font-outfit">Emergency SOS Dispatched</p>
                        <p className="text-xs opacity-90 mt-0.5">Critical alert sent to: <strong className="underline">{emergencyContact || "emergency contact"}</strong></p>
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Triage Verdict</span>
                  <span className={`px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${result.triage_result === 'HIGH' ? 'bg-rose-50 border-rose-200 text-rose-600' : result.triage_result === 'LOW' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-amber-50 border-amber-200 text-amber-600'}`}>
                    {result.triage_result} RISK
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight font-outfit mb-3">Diagnostic Verdict</h2>
                <p className="text-slate-650 font-semibold text-sm leading-relaxed mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  "{result.deep_analysis?.simple_summary || "Preliminary evaluation complete."}"
                </p>
                {result.deep_analysis && (
                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Recommended Actions</h4>
                    <ul className="space-y-2">
                      {(result.deep_analysis.action_plan || []).map((action, idx) => (
                        <li key={idx} className="flex gap-2 text-xs font-semibold text-slate-700 leading-relaxed">
                          <span className="text-[#005A51]">•</span><span>{action}</span>
                        </li>
                      ))}
                    </ul>
                    {result.deep_analysis.hospital_recommendation && (
                      <div className="flex items-center gap-2 pt-2 text-xs font-bold text-[#005A51]">
                        <span>🏥 Recommended Setting:</span>
                        <span className="bg-[#005A51]/10 px-2.5 py-0.5 rounded-full text-[10px]">{result.deep_analysis.hospital_recommendation}</span>
                      </div>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-3 mt-6 pt-4 border-t border-slate-100 flex-wrap">
                  <button onClick={handleAnalyze} disabled={loading} className="bg-[#005A51] hover:bg-[#004D45] text-white px-5 py-3 rounded-xl font-bold text-sm flex items-center gap-2 shadow-sm transition-all disabled:opacity-75">
                    <RefreshCw size={16} className={loading ? "animate-spin" : ""} /><span>Re-Analyze</span>
                  </button>
                  <button onClick={handleDownloadPDF} className="bg-white border border-slate-200 hover:bg-slate-50 px-5 py-3 rounded-xl font-bold text-sm flex items-center gap-2 shadow-sm transition-all">
                    <Download size={16} /><span>Download Report</span>
                  </button>
                </div>
              </div>

              {/* Hospital Map */}
              {result.triage_result === 'HIGH' && showHospitals && (
                <div className="space-y-4 mt-6 animate-in slide-in-from-bottom-4 duration-300">
                  <div className="bg-rose-600 p-5 rounded-2xl text-white flex items-center gap-4 shadow-md">
                    <Ambulance size={28} className="shrink-0 animate-bounce" />
                    <div>
                      <h3 className="font-extrabold text-base uppercase tracking-tight font-outfit">Emergency Triage Routing</h3>
                      <p className="text-xs opacity-90">Haversine GPS routing to the nearest emergency departments in Pune.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {hospitalList.map(h => (
                      <div key={h.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:border-rose-100 hover:shadow-md transition-all">
                        <div>
                          <p className="text-sm font-bold text-slate-800">{h.name}</p>
                          <span className="text-[10px] text-emerald-600 font-extrabold uppercase block mt-1">{h.distance} km away</span>
                          <span className="text-[9px] text-slate-400 font-semibold block">{h.type}</span>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <a href={`tel:${h.phone}`} className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 transition-all"><Phone size={14} /></a>
                          <a href={`https://www.google.com/maps/dir/?api=1&origin=${userLocation?.lat},${userLocation?.lng}&destination=${h.lat},${h.lng}&travelmode=driving`} target="_blank" rel="noreferrer" className="bg-[#005A51] text-white p-2.5 rounded-lg hover:bg-[#004D45] transition-all"><MapPin size={14} /></a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-gradient-to-br from-white to-slate-50/20 border border-slate-100 rounded-[32px] p-10 text-center shadow-sm flex flex-col items-center justify-center min-h-[400px]">
              <div className="bg-[#005A51]/5 p-5 rounded-full text-[#005A51] mb-6 animate-pulse"><Activity size={36} strokeWidth={2} /></div>
              <h2 className="text-2xl font-extrabold text-slate-900 font-outfit tracking-tight mb-2">Welcome to Your Care Hub</h2>
              <p className="text-slate-500 font-medium text-sm max-w-sm leading-relaxed mb-8">Sync your vitals via Google Fit, connect your smart device, or input details manually to begin your AI-powered triage assessment.</p>
              <button onClick={handleAnalyze} disabled={loading} className="bg-[#005A51] hover:bg-[#004D45] text-white px-8 py-4 rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2">
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Activity size={16} />}
                <span>Begin AI Assessment</span>
              </button>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="lg:col-span-4 space-y-6">
          {/* Physician selector */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight font-outfit flex items-center gap-2 pb-2 border-b border-slate-50">
              <User size={18} className="text-[#005A51]" /><span>Reviewing Physician</span>
            </h3>
            <div className="space-y-2.5">
              {doctorsList.map(doc => (
                <button key={doc.id} onClick={() => setSelectedDoctorId(doc.id)}
                  className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${selectedDoctorId === doc.id ? 'bg-[#005A51]/5 border-[#005A51] shadow-sm' : 'bg-white border-slate-100 hover:border-slate-300'}`}>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Dr. {doc.full_name}</p>
                    {doc.rating && <span className="text-[10px] font-black text-amber-600 block mt-0.5">⭐ {doc.rating.toFixed(1)} / 5.0</span>}
                  </div>
                  {selectedDoctorId === doc.id ? <CheckCircle size={16} className="text-[#005A51]" /> : <div className="w-4 h-4 rounded-full border border-slate-200" />}
                </button>
              ))}
            </div>
          </div>

          {/* Emergency SOS */}
          <div className="bg-rose-50/40 border border-rose-100/50 rounded-3xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-rose-100/30">
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-rose-600 font-outfit flex items-center gap-1.5">
                <ShieldCheck size={14} /> Emergency Contacts
              </h3>
              {contactSaved && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-0.5"><CheckCircle size={10} /> Saved</span>}
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase block ml-1">SOS Phone</label>
                <div className="relative flex items-center bg-white border border-rose-100 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-[#005A51]/10 focus-within:border-[#005A51] transition-all">
                  <Phone size={14} className="text-slate-400 absolute left-3" />
                  <input id="emergency-contact-input" type="tel" value={emergencyContact}
                    onChange={e => { setEmergencyContact(e.target.value); setContactSaved(false); }}
                    placeholder="Emergency phone number"
                    className="bg-transparent outline-none text-xs font-bold text-slate-800 w-full pl-6 placeholder:text-slate-400" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase block ml-1">SOS Email Alert</label>
                <div className="relative flex items-center bg-white border border-rose-100 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-[#005A51]/10 focus-within:border-[#005A51] transition-all">
                  <span className="text-slate-400 absolute left-3 text-xs font-black">@</span>
                  <input id="emergency-email-input" type="email" value={emergencyEmail}
                    onChange={e => { setEmergencyEmail(e.target.value); setContactSaved(false); }}
                    placeholder="Emergency contact email"
                    className="bg-transparent outline-none text-xs font-bold text-slate-800 w-full pl-6 placeholder:text-slate-400" />
                </div>
              </div>
            </div>
            <button onClick={handleSaveContact} disabled={savingContact || (!emergencyContact && !emergencyEmail)}
              className="w-full py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-40 transition-all flex items-center justify-center gap-1.5 shadow-sm">
              {savingContact ? <RefreshCw size={12} className="animate-spin" /> : <CheckCircle size={12} />}
              <span>{savingContact ? 'Saving...' : 'Save Emergency Contact'}</span>
            </button>
            <p className="text-[9px] text-slate-400 font-semibold text-center mt-1">Saved contacts sync automatically for triage alerts.</p>
          </div>

          {/* Transmit to doctor */}
          <button onClick={handleSendToDoctor} disabled={!result || !selectedDoctorId || isSending}
            className={`w-full py-4 rounded-xl font-bold text-sm transition-all flex justify-center items-center gap-2 shadow-sm ${sendSuccess ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white hover:bg-blue-600 disabled:opacity-40'}`}>
            {sendSuccess ? <><CheckCircle size={16} /><span>Sent Successfully</span></> : <><Send size={16} /><span>Transmit Chart Data</span></>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LiveTriageTab;
