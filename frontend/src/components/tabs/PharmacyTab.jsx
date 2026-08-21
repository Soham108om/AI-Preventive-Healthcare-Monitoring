// PharmacyTab.jsx — Digital Pillbox Tab
// Extracted from PatientDashboard.jsx
import { useRef } from "react";
import {
  Pill, ShoppingCart, AlertOctagon, ExternalLink,
  CalendarDays, Trash2, Camera, UploadCloud,
  CheckCircle, RefreshCw, Send, X
} from "lucide-react";

const FIELD_CLASS = "w-full bg-[#F2FAF8] border border-[#DFEBE8] px-3.5 py-2.5 rounded-xl outline-none focus:border-[#007F73] focus:ring-2 focus:ring-[#007F73]/10 transition-all font-semibold text-[#173B3A] text-xs placeholder:text-[#94A5A3]";
const LABEL_CLASS = "text-[10px] font-black uppercase tracking-wider text-[#6D807E] block mb-1.5 ml-1";

const PharmacyLink = ({ href, bg, border, text, hover, label }) => (
  <a href={href} target="_blank" rel="noreferrer"
    className={`w-full py-2 rounded-xl font-bold text-xs flex items-center justify-between px-3 ${bg} ${border} ${text} ${hover} transition-all`}>
    <span>{label}</span>
    <ExternalLink size={12} />
  </a>
);

const PharmacyTab = ({
  medications, setMedications,
  showAddMedModal, setShowAddMedModal,
  newMed, setNewMed,
  scanningPill, setScanningPill,
  ddiWarning, setDdiWarning,
  ddiChecking, setDdiChecking,
  fileInputRef,
}) => {
  const emptyMed = { name: '', dosage: '', frequency: '1 pill daily', total_pills: '', remaining_pills: '', expiry_date: '' };

  const handleAddMed = (overrideAdd = false) => {
    setMedications(prev => [...prev, { id: Date.now(), ...newMed, price_estimate: "TBD", refill_requested: false }]);
    setShowAddMedModal(false);
    setDdiWarning(null);
    setNewMed(emptyMed);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanningPill(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Data = reader.result;
      try {
        const res = await fetch("http://localhost:5000/recognize_pill", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64Data })
        });
        const result = await res.json();
        if (result.success && result.data) {
          setNewMed(prev => ({
            ...prev,
            name: result.data.name || prev.name,
            dosage: result.data.dosage || prev.dosage,
            frequency: result.data.frequency || prev.frequency,
          }));
          alert("Pill box scanned successfully!");
        } else {
          alert("Could not recognize details automatically. Please fill manually.");
        }
      } catch (err) {
        console.error("Scan error:", err);
        alert("Scanner service error. Please fill manually.");
      } finally {
        setScanningPill(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const allMedNames = [...medications.map(m => m.name), newMed.name];
    if (allMedNames.length >= 2) {
      setDdiChecking(true);
      try {
        const res = await fetch("http://localhost:5000/check_ddi", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ medications: allMedNames }),
        });
        const data = await res.json();
        if (data.has_interaction && data.warnings.length > 0) {
          setDdiWarning({ warnings: data.warnings });
          setDdiChecking(false);
          return;
        }
      } catch (err) {
        console.error("DDI check failed:", err);
      } finally {
        setDdiChecking(false);
      }
    }
    handleAddMed();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-100">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-outfit">Digital Pillbox</h1>
          <p className="mt-1 text-slate-500 font-semibold text-sm">Track medication inventory, expiry timelines, and submit refill notices.</p>
        </div>
        <button className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-3 rounded-xl font-bold text-sm flex items-center gap-2 shadow-sm transition-all">
          <ShoppingCart size={16} /><span>Reorder All via 1mg</span>
        </button>
      </header>

      {/* Medication Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {medications.map(med => {
          const percentLeft = (med.remaining_pills / med.total_pills) * 100;
          const dailyPills = parseInt((String(med.frequency).match(/\d+/) || [1])[0]);
          const daysLeft = med.remaining_pills / dailyPills;
          const isLow = daysLeft <= 5;
          const isExpiring = new Date(med.expiry_date) <= new Date(new Date().setDate(new Date().getDate() + 30));
          const isAlert = isLow || isExpiring;

          return (
            <div key={med.id} className={`bg-white rounded-2xl border p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-200 ${isAlert ? 'border-rose-200' : 'border-slate-100'}`}>
              <div className="mb-5">
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-2.5 rounded-xl ${isLow ? 'bg-rose-50 text-rose-600' : 'bg-[#005A51]/5 text-[#005A51]'}`}>
                    <Pill size={20} />
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isAlert && (
                      <span className="flex items-center gap-1 text-[9px] uppercase font-black tracking-widest text-rose-500 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-100">
                        <AlertOctagon size={10} /> {isExpiring ? "Expiring" : `${Math.floor(daysLeft)} Days Left`}
                      </span>
                    )}
                    <button onClick={() => setMedications(medications.filter(m => m.id !== med.id))}
                      className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <h3 className="text-lg font-bold text-slate-800 tracking-tight font-outfit mb-0.5">{med.name}</h3>
                <p className="text-xs font-semibold text-slate-400">{med.dosage} • {med.frequency}</p>
              </div>

              {/* Inventory Bar */}
              <div className="mb-5">
                <div className="flex justify-between text-xs font-semibold mb-1.5">
                  <span className="text-slate-500">Inventory Status</span>
                  <span className={isLow ? 'text-rose-500 font-bold' : 'text-slate-700'}>{med.remaining_pills} / {med.total_pills} pills</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${isLow ? 'bg-rose-500' : 'bg-[#005A51]'}`} style={{ width: `${Math.max(percentLeft, 5)}%` }} />
                </div>
              </div>

              {/* Expiry */}
              <div className="flex items-center gap-2 mb-5 text-[11px] font-bold text-slate-400">
                <CalendarDays size={12} />
                <span>Expires: </span>
                <span className={isExpiring ? 'text-rose-500' : ''}>{new Date(med.expiry_date).toLocaleDateString()}</span>
              </div>

              {/* Actions */}
              <div className="space-y-2 mt-auto pt-4 border-t border-slate-100">
                <p className={`text-[9px] font-extrabold uppercase tracking-widest text-center mb-1.5 ${isAlert ? 'text-rose-500' : 'text-slate-400'}`}>Compare & Refill</p>
                {isAlert && !med.refill_requested && (
                  <button onClick={() => setMedications(medications.map(m => m.id === med.id ? { ...m, refill_requested: true } : m))}
                    className="w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 bg-[#005A51] hover:bg-[#004D45] text-white transition-all shadow-sm">
                    <Send size={12} /><span>Request Rx Refill</span>
                  </button>
                )}
                {isAlert && med.refill_requested && (
                  <div className="w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100">
                    <CheckCircle size={12} /><span>Rx Request Pending</span>
                  </div>
                )}
                <PharmacyLink href={`https://www.1mg.com/search/all?name=${med.name}`} bg="bg-rose-50" border="border border-rose-100" text="text-rose-700" hover="hover:bg-rose-600 hover:text-white" label="Tata 1mg" />
                <PharmacyLink href={`https://pharmeasy.in/search/all?name=${med.name}`} bg="bg-teal-50" border="border border-teal-100" text="text-teal-700" hover="hover:bg-teal-600 hover:text-white" label="PharmEasy" />
                <PharmacyLink href={`https://www.apollopharmacy.in/search-medicines/${med.name}`} bg="bg-blue-50" border="border border-blue-100" text="text-blue-700" hover="hover:bg-blue-600 hover:text-white" label="Apollo Pharmacy" />
              </div>
            </div>
          );
        })}

        {/* Add Prescription Card */}
        <button onClick={() => setShowAddMedModal(true)}
          className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center text-slate-400 hover:border-[#005A51] hover:text-[#005A51] hover:bg-[#005A51]/5 transition-all min-h-[300px]">
          <div className="bg-white p-3 rounded-full shadow-sm mb-3"><Pill size={24} /></div>
          <span className="font-bold text-sm">Add Prescription</span>
        </button>
      </div>

      {/* Add Prescription Modal */}
      {showAddMedModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-extrabold text-slate-900 font-outfit tracking-tight">Add Medicine</h3>
              <button onClick={() => setShowAddMedModal(false)} className="bg-slate-100 p-2 rounded-full text-slate-500 hover:bg-slate-200"><X size={18} /></button>
            </div>

             {/* Pill Scanner Banner */}
            <div className="mb-6 bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4">
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
              <div className="bg-[#005A51] text-white p-3.5 rounded-xl shadow-sm"><Camera size={20} /></div>
              <div className="flex-1 text-center sm:text-left">
                <h4 className="font-bold text-slate-800 text-xs mb-0.5">Vision Pill Scanner</h4>
                <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">Upload pill box photo and let AI fill medication details.</p>
              </div>
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={scanningPill}
                className="bg-white border border-[#005A51] text-[#005A51] px-3.5 py-1.5 rounded-lg font-bold text-xs hover:bg-[#005A51] hover:text-white transition-all shadow-sm flex items-center gap-1.5 shrink-0">
                {scanningPill ? <><RefreshCw size={12} className="animate-spin" /> Scanning...</> : <><UploadCloud size={12} /> Upload</>}
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className={LABEL_CLASS}>Medicine Name</label>
                <input required type="text" value={newMed.name} onChange={e => setNewMed({ ...newMed, name: e.target.value })} placeholder="e.g. Paracetamol" className={FIELD_CLASS} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className={LABEL_CLASS}>Dosage</label>
                  <input required type="text" value={newMed.dosage} onChange={e => setNewMed({ ...newMed, dosage: e.target.value })} placeholder="e.g. 500mg" className={FIELD_CLASS} />
                </div>
                <div className="space-y-1">
                  <label className={LABEL_CLASS}>Frequency</label>
                  <input required type="text" value={newMed.frequency} onChange={e => setNewMed({ ...newMed, frequency: e.target.value })} placeholder="e.g. 2 pills daily" className={FIELD_CLASS} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className={LABEL_CLASS}>Total Pills Bought</label>
                  <input required type="number" value={newMed.total_pills} onChange={e => setNewMed({ ...newMed, total_pills: e.target.value, remaining_pills: e.target.value })} placeholder="e.g. 30" className={FIELD_CLASS} />
                </div>
                <div className="space-y-1">
                  <label className={LABEL_CLASS}>Expiry Date</label>
                  <input required type="date" value={newMed.expiry_date} onChange={e => setNewMed({ ...newMed, expiry_date: e.target.value })} className={FIELD_CLASS} />
                </div>
              </div>

              {/* DDI Warning */}
              {ddiWarning && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 animate-in slide-in-from-top-2 duration-300">
                  <div className="flex items-start gap-2.5 mb-3">
                    <AlertOctagon size={18} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-extrabold text-xs text-amber-800 uppercase tracking-widest mb-0.5">Drug Interaction Detected</p>
                      <p className="text-[10px] text-amber-700 font-semibold leading-relaxed">Clinical interactions detected between your medications:</p>
                    </div>
                  </div>
                  <ul className="space-y-1.5 mb-3.5">
                    {ddiWarning.warnings.map((w, i) => (
                      <li key={i} className="text-[10px] bg-amber-100 rounded-lg px-3 py-2 font-semibold leading-relaxed text-amber-900">⚠️ {w}</li>
                    ))}
                  </ul>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => handleAddMed(true)} className="flex-1 bg-amber-600 text-white py-2.5 rounded-xl font-bold text-xs hover:bg-amber-700 transition-all">Add Anyway</button>
                    <button type="button" onClick={() => setDdiWarning(null)} className="flex-1 bg-white border border-slate-200 py-2.5 rounded-xl font-bold text-xs hover:bg-slate-50 transition-all">Cancel</button>
                  </div>
                </div>
              )}

              <button type="submit" disabled={ddiChecking}
                className="w-full bg-[#005A51] hover:bg-[#004D45] text-white font-bold py-3.5 rounded-xl mt-4 transition-all shadow-sm disabled:opacity-50 flex justify-center items-center gap-2">
                {ddiChecking ? <><RefreshCw size={16} className="animate-spin" /> Checking...</> : "Save Prescription"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PharmacyTab;
