import { useState } from "react";
import { RefreshCw, CheckCircle, Clock, Share2, Mail, MessageSquare, AlertCircle, X, Edit2, Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import supabase from "../../services/supabase";

const HistoryTab = ({
  historyReports = [],
  loadingHistory = false,
  userInfo = { fullName: "Patient" },
  emergencyContactName = "", setEmergencyContactName = () => {},
  emergencyContact = "", setEmergencyContact = () => {},
  emergencyEmail = "", setEmergencyEmail = () => {},
  savingContact = false, setSavingContact = () => {},
  setContactSaved = () => {}
}) => {
  const [selectedReport, setSelectedReport] = useState(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareStatus, setShareStatus] = useState(null);
  const [editingContact, setEditingContact] = useState(false);
  const [contactNameInput, setContactNameInput] = useState(emergencyContactName || "");
  const [contactPhoneInput, setContactPhoneInput] = useState(emergencyContact || "");
  const [contactEmailInput, setContactEmailInput] = useState(emergencyEmail || "");

  const handleOpenShareModal = (report) => {
    setSelectedReport(report);
    setContactNameInput(emergencyContactName || "");
    setContactPhoneInput(emergencyContact || "");
    setContactEmailInput(emergencyEmail || "");
    setShareStatus(null);
    const hasContact = Boolean((emergencyContactName && emergencyContactName.trim()) || (emergencyContact && emergencyContact.trim()) || (emergencyEmail && emergencyEmail.trim()));
    setEditingContact(!hasContact);
    setIsShareModalOpen(true);
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
      setShareStatus({ type: "info", message: "Emergency contact saved. Ready to share report!" });
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
        patient_name: userInfo?.fullName || "Patient",
        recipient_name: targetName,
        recipient_email: targetEmail,
        recipient_phone: targetPhone,
        channel: channelPreference,
        report: {
          ...selectedReport,
          vitals: selectedReport?.vitals || {}
        }
      };

      const res = await fetch("http://localhost:5000/share-report", {
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
        message: "Unable to reach sharing service. Please ensure backend is active."
      });
    } finally {
      setShareLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#6D807E]">Archived Records</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#173B3A] tracking-tight font-outfit mt-0.5">Clinical History</h1>
        </div>
      </div>

      {loadingHistory ? (
        <div className="flex justify-center py-20 text-[#007F73]">
          <RefreshCw size={36} className="animate-spin" />
        </div>
      ) : historyReports.length === 0 ? (
        <div className="bg-white border border-[#DFEBE8] rounded-2xl p-12 text-center text-[#94A5A3] font-semibold text-xs sm:text-sm">
          No archived reports found. Perform triage analyses to build history.
        </div>
      ) : (
        <div className="space-y-4">
          {historyReports.map(report => (
            <div key={report.id} className="bg-white rounded-2xl border border-[#DFEBE8] shadow-sm p-6 flex flex-col md:flex-row justify-between gap-6 hover:border-[#007F73]/30 transition-all duration-200">
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider border ${
                    report.risk_level === 'HIGH'
                      ? 'bg-rose-50 border-rose-200 text-rose-600'
                      : report.risk_level === 'LOW'
                        ? 'bg-[#E8F8F5] border-[#007F73]/20 text-[#007F73]'
                        : 'bg-amber-50 border-amber-200 text-amber-600'
                  }`}>
                    {report.risk_level} Risk
                  </span>
                  <span className="text-[10px] font-bold text-[#94A5A3] tracking-wider">
                    {new Date(report.created_at).toLocaleDateString()} at {new Date(report.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-[#173B3A] leading-relaxed">
                  "{report.ai_summary}"
                </h4>

                {/* Vitals Snapshot */}
                {report.vitals && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    <div className="bg-[#F2FAF8] px-3 py-1.5 rounded-xl border border-[#DFEBE8]">
                      <span className="text-[9px] font-bold text-[#6D807E] uppercase block">Heart Rate</span>
                      <span className="text-xs font-extrabold text-[#173B3A]">{report.vitals.heart_rate || "N/A"} bpm</span>
                    </div>
                    <div className="bg-[#F2FAF8] px-3 py-1.5 rounded-xl border border-[#DFEBE8]">
                      <span className="text-[9px] font-bold text-[#6D807E] uppercase block">SpO2 Oxygen</span>
                      <span className="text-xs font-extrabold text-[#173B3A]">{report.vitals.spo2 || "N/A"}%</span>
                    </div>
                    <div className="bg-[#F2FAF8] px-3 py-1.5 rounded-xl border border-[#DFEBE8]">
                      <span className="text-[9px] font-bold text-[#6D807E] uppercase block">Blood Pressure</span>
                      <span className="text-xs font-extrabold text-[#173B3A]">{report.vitals.systolic_bp || "120"}/{report.vitals.diastolic_bp || "80"} mmHg</span>
                    </div>
                    <div className="bg-[#F2FAF8] px-3 py-1.5 rounded-xl border border-[#DFEBE8]">
                      <span className="text-[9px] font-bold text-[#6D807E] uppercase block">Daily Steps</span>
                      <span className="text-xs font-extrabold text-[#173B3A]">{report.vitals.steps || "N/A"} steps</span>
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    onClick={() => handleOpenShareModal(report)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold bg-[#E8F8F5] text-[#007F73] hover:bg-[#007F73] hover:text-white border border-[#007F73]/20 transition-all shadow-sm"
                  >
                    <Share2 size={13} />
                    <span>Share Report</span>
                  </button>
                </div>
              </div>

              <div className="md:w-72 bg-[#F2FAF8] rounded-xl p-4 border border-[#DFEBE8] flex flex-col justify-between text-xs">
                <div>
                  <span className="text-[9px] font-black text-[#6D807E] uppercase tracking-widest block mb-2">Clinical Status</span>
                  {report.status === 'Verified' ? (
                    <p className="text-[#173B3A] font-semibold italic leading-relaxed text-xs">"{report.doctor_notes}"</p>
                  ) : report.status === 'Pending Review' ? (
                    <div className="flex items-center gap-1.5 text-[#94A5A3] font-semibold py-1.5 text-xs">
                      <Clock size={13} className="animate-pulse text-[#007F73]" />
                      <span>Awaiting Physician Review</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-[#007F73] font-semibold py-1.5 text-xs">
                      <CheckCircle2 size={13} className="text-[#007F73]" />
                      <span>Self-Diagnosed Record</span>
                    </div>
                  )}
                </div>
                {report.status === 'Verified' && (
                  <div className="flex items-center gap-1.5 pt-3 mt-3 border-t border-[#DFEBE8] text-[10px] font-extrabold text-[#16A085] uppercase tracking-widest">
                    <CheckCircle size={12} className="text-[#16A085]" />
                    <span>Digitally Signed</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}


      {/* 📲 SHARE CLINICAL REPORT MODAL */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-[#DFEBE8] space-y-6 animate-in zoom-in-95 duration-200 relative">
            <button
              onClick={() => setIsShareModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-[#94A5A3] hover:text-[#173B3A] hover:bg-[#F2FAF8] transition-all"
            >
              <X size={18} />
            </button>

            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E8F8F5] text-[#007F73] text-[10px] font-extrabold uppercase tracking-widest border border-[#007F73]/20 mb-2">
                <Share2 size={12} />
                <span>Archived Report Sharing</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#173B3A] font-outfit">
                Share Clinical Report
              </h2>
              <p className="text-xs text-[#6D807E] font-medium mt-1">
                Deliver this archived clinical report to your emergency / loved-one contact.
              </p>
            </div>

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

            {!editingContact && (emergencyContactName || emergencyContact || emergencyEmail) ? (
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
                </div>
              </div>
            ) : (
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

export default HistoryTab;
