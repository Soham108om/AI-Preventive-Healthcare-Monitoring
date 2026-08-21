import { useState, useEffect } from "react";
import supabase from "../services/supabase";
import { 
  Stethoscope, AlertTriangle, Clock, CheckCircle, 
  Activity, Heart, Wind, Droplets, FileText, User,
  LogOut, LayoutDashboard, ChevronRight, ShieldCheck
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import MedAILogo from "../components/MedAILogo";

export default function DoctorDashboard() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [doctorNotes, setDoctorNotes] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [activeTab, setActiveTab] = useState("triage");
  const [refills, setRefills] = useState([
    
  ]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPendingReports();
  }, []);

  const fetchPendingReports = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('medical_reports')
        .select('*')
        .eq('status', 'Pending Review')
        .eq('doctor_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const sortedData = data.sort((a, b) => {
        if (a.risk_level === 'HIGH' && b.risk_level !== 'HIGH') return -1;
        if (a.risk_level !== 'HIGH' && b.risk_level === 'HIGH') return 1;
        return 0;
      });

      setReports(sortedData);
    } catch (err) {
      console.error("Error fetching reports:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!selectedReport) return;
    setIsVerifying(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('medical_reports')
        .update({ 
          status: 'Verified', 
          doctor_notes: doctorNotes || "AI Assessment verified and approved. No additional notes.",
          doctor_id: user.id 
        })
        .eq('id', selectedReport.id);

      if (error) throw error;

      alert("Report successfully verified & signed!");
      setSelectedReport(null);
      setDoctorNotes("");
      setHasReviewed(false);
      fetchPendingReports();
    } catch (err) {
      alert(`Failed to verify: ${err.message}`);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen bg-white font-sans text-slate-900 selection:bg-blue-100">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        .serif { font-family: 'Instrument Serif', serif; }
        .glass { background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.3); }
      `}</style>

      {/* ── SIDEBAR (Premium Clinical Style) ── */}
      <aside className="hidden lg:flex flex-col w-80 bg-slate-50 border-r border-slate-200 p-8 fixed h-full">
        <MedAILogo tagline="Physician Portal" size="lg" className="mb-12" />

        <nav className="flex-1 space-y-2">
          <button onClick={() => setActiveTab("triage")} className={`w-full flex items-center justify-between p-4 rounded-2xl font-bold text-sm ${activeTab === 'triage' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}>
            <div className="flex items-center gap-3"><LayoutDashboard size={20}/> Triage Queue</div>
            <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded-lg text-[10px]">{reports.length}</span>
          </button>
          <button onClick={() => setActiveTab("refills")} className={`w-full flex items-center justify-between p-4 rounded-2xl font-bold text-sm ${activeTab === 'refills' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}>
            <div className="flex items-center gap-3">
               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pill"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg>
               Rx Refills
            </div>
            {refills.filter(r => r.status === 'Pending').length > 0 && (
              <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-lg text-[10px]">{refills.filter(r => r.status === 'Pending').length}</span>
            )}
          </button>
        </nav>

        <button onClick={handleLogout} className="flex items-center gap-3 p-4 text-slate-400 font-bold text-sm hover:text-red-500 transition-colors">
          <LogOut size={20}/> Secure Logout
        </button>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 lg:ml-80 p-8 md:p-12">
        <header className="mb-12">
          <h1 className="serif text-6xl text-slate-900 mb-2">Physician Portal</h1>
          <p className="text-slate-400 tracking-wide uppercase text-[10px] font-bold">Clinical Oversight & AI Verification</p>
        </header>

        {activeTab === "triage" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* 📋 LEFT: PATIENT QUEUE */}
          <div className="lg:col-span-4 space-y-4">
            <h2 className="serif text-3xl text-slate-800 mb-6 flex items-center gap-3">
              <Clock size={24} className="text-blue-500"/> Pending
            </h2>

            {loading ? (
              <div className="p-8 text-center text-slate-300 font-bold animate-pulse">Loading secure stream...</div>
            ) : reports.length === 0 ? (
              <div className="bg-slate-50 p-12 rounded-[40px] border border-slate-100 text-center">
                <CheckCircle size={48} className="text-emerald-300 mx-auto mb-4 opacity-40"/>
                <p className="serif text-2xl text-slate-400">Queue Clear</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 pb-10 custom-scrollbar">
                {reports.map(report => (
                  <button 
                    key={report.id}
                    onClick={() => { setSelectedReport(report); setDoctorNotes(""); setHasReviewed(false); }}
                    className={`w-full text-left p-6 rounded-[32px] border transition-all duration-300 ${
                      selectedReport?.id === report.id 
                        ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-200 -translate-y-1' 
                        : 'bg-white border-slate-100 shadow-sm hover:border-blue-200'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${selectedReport?.id === report.id ? 'text-blue-100' : 'text-slate-400'}`}>
                        Patient ID: {report.patient_id.substring(0, 8)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-2xl ${selectedReport?.id === report.id ? 'bg-white/20' : report.risk_level === 'HIGH' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                        {report.risk_level === 'HIGH' ? <AlertTriangle size={24} /> : <Activity size={24} />}
                      </div>
                      <div>
                        <p className={`serif text-2xl ${selectedReport?.id === report.id ? 'text-white' : report.risk_level === 'HIGH' ? 'text-red-600' : 'text-emerald-600'}`}>
                          {report.risk_level} Risk
                        </p>
                        <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${selectedReport?.id === report.id ? 'text-blue-100' : 'text-slate-400'}`}>
                          Captured {new Date(report.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 🩺 RIGHT: CLINICAL REVIEW PANEL */}
          <div className="lg:col-span-8">
            {selectedReport ? (
              <div className="bg-white rounded-[48px] shadow-2xl border border-slate-50 overflow-hidden animate-in slide-in-from-right-8 duration-500">
                
                {/* Visual Banner */}
                <div className={`p-10 md:p-14 flex justify-between items-end ${selectedReport.risk_level === 'HIGH' ? 'bg-red-600 text-white' : 'bg-slate-900 text-white'}`}>
                  <div>
                    <h2 className="serif text-7xl leading-none mb-4">{selectedReport.risk_level} Risk</h2>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_#34d399]"/>
                      <p className="text-xs font-bold uppercase tracking-[0.3em] opacity-60">AI Triage Authenticated</p>
                    </div>
                  </div>
                  <div className="text-right hidden md:block">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">Record Timestamp</p>
                    <p className="serif text-xl">{new Date(selectedReport.created_at).toLocaleString()}</p>
                  </div>
                </div>

                <div className="p-10 md:p-14 space-y-12">
                  {/* Vitals Matrix */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {[
                      { l: "Heart Rate", v: selectedReport.vitals.heart_rate, u: "bpm", i: <Heart size={16} className="text-red-500"/> },
                      { l: "SpO2", v: selectedReport.vitals.spo2, u: "%", i: <Wind size={16} className="text-blue-500"/> },
                      { l: "Blood Pressure", v: `${selectedReport.vitals.systolic_bp}/${selectedReport.vitals.diastolic_bp}`, u: "mmHg", i: <Droplets size={16} className="text-purple-500"/> },
                      { l: "Activity", v: selectedReport.vitals.steps, u: "steps", i: <Activity size={16} className="text-emerald-500"/> }
                    ].map(item => (
                      <div key={item.l} className="bg-slate-50 p-6 rounded-[32px] border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">{item.i} {item.l}</p>
                        <p className="serif text-3xl text-slate-800">{item.v} <span className="text-xs font-bold text-slate-300 uppercase">{item.u}</span></p>
                      </div>
                    ))}
                  </div>

                  {/* AI Summary Section */}
                  <div className="relative">
                    <div className="absolute -left-6 top-0 bottom-0 w-1 bg-blue-600 rounded-full"/>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 mb-4 ml-2">Clinical Intelligence Summary</h3>
                    <p className="serif text-3xl text-slate-700 italic leading-tight ml-2">
                      "{selectedReport.ai_summary}"
                    </p>
                  </div>

                  {/* Physician Intervention */}
                  <div className="space-y-6">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 flex items-center gap-2">
                      <Stethoscope size={16}/> Clinical Observations
                    </h3>
                    <textarea 
                      className="w-full bg-slate-50 border border-slate-200 rounded-[32px] p-8 text-slate-800 focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-600 transition-all serif text-2xl italic shadow-inner"
                      rows="3"
                      placeholder="Add Treatment Recommendations..."
                      value={doctorNotes}
                      onChange={(e) => setDoctorNotes(e.target.value)}
                    ></textarea>

                    {/* Verification Protocol */}
                    <div className="bg-slate-900 rounded-[32px] p-8 text-white">
                      <div className="flex items-start gap-4 mb-8">
                        <input 
                          type="checkbox" 
                          id="legal-check"
                          className="mt-1.5 w-6 h-6 accent-blue-500 cursor-pointer"
                          checked={hasReviewed}
                          onChange={(e) => setHasReviewed(e.target.checked)}
                        />
                        <label htmlFor="legal-check" className="text-sm font-medium leading-relaxed opacity-70 cursor-pointer select-none">
                          I confirm that I have reviewed the patient's raw vitals and take medical responsibility for verifying this AI-generated assessment.
                        </label>
                      </div>

                      <button 
                        onClick={handleVerify}
                        disabled={isVerifying || !hasReviewed}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-6 rounded-2xl transition-all flex justify-center items-center gap-3 disabled:opacity-30"
                      >
                        {isVerifying ? "AUTHENTICATING..." : <><ShieldCheck size={22}/> VERIFY & SIGN REPORT</>}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[60vh] flex flex-col items-center justify-center text-slate-300 bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-[64px] p-10 text-center">
                <div className="bg-white p-8 rounded-[40px] shadow-sm mb-6">
                  <FileText size={64} className="opacity-20 text-slate-900" />
                </div>
                <h3 className="serif text-4xl text-slate-400">Select Patient</h3>
                <p className="text-xs font-bold uppercase tracking-widest mt-4">Awaiting Clinical Selection from Queue</p>
              </div>
            )}
          </div>

        </div>
        )}

        {activeTab === "refills" && (
          <div className="animate-in slide-in-from-bottom-8 duration-500">
            <h2 className="serif text-4xl text-slate-800 mb-8 flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500 lucide lucide-pill"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg>
              Prescription Refill Requests
            </h2>
            
            <div className="grid gap-6">
              {refills.length === 0 ? (
                <p className="text-slate-400 font-medium">No pending refill requests.</p>
              ) : refills.map(req => (
                <div key={req.id} className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${req.status === 'Pending' ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-600'}`}>{req.status}</span>
                      <span className="text-xs text-slate-400 font-bold">{new Date(req.requested_at).toLocaleString()}</span>
                    </div>
                    <h3 className="serif text-3xl text-slate-900">{req.medicine}</h3>
                    <p className="text-slate-500 font-bold text-sm mt-1">Patient: {req.patient_name} <span className="opacity-50">({req.patient_id})</span></p>
                  </div>
                  
                  {req.status === 'Pending' ? (
                    <button 
                      onClick={() => setRefills(refills.map(r => r.id === req.id ? { ...r, status: "Approved" } : r))}
                      className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-3 shadow-lg hover:bg-blue-500 transition-all whitespace-nowrap"
                    >
                      <CheckCircle size={18}/> Approve 30-Day Refill
                    </button>
                  ) : (
                    <div className="bg-emerald-50 text-emerald-700 px-8 py-4 rounded-2xl font-bold border border-emerald-100 flex items-center gap-2">
                       <ShieldCheck size={18}/> Digitally Signed
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}