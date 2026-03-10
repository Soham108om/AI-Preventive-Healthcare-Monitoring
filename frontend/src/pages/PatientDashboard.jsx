import { useState, useEffect } from "react";
import supabase from "../services/supabase";
import { 
  Activity, Heart, Wind, Thermometer, LogOut, 
  Ambulance, MapPin, Phone, Download, RefreshCw, 
  Edit2, Watch, Terminal, Send, CheckCircle, 
  ClipboardList, Clock, FileText, Stethoscope, ChevronRight, LayoutDashboard, History, Settings, LocateFixed
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import { useGoogleLogin } from '@react-oauth/google';
import { fetchGoogleFitData } from '../services/googleFit';

// 🏥 VERIFIED HOSPITAL DATABASE
const REAL_PUNE_HOSPITALS = [
  { id: 1, name: "VishwaRaj Hospital", type: "General ER", lat: 18.4893, lng: 74.0242, phone: "020 2691 9000" },
  { id: 2, name: "Noble Hospital", type: "Cardiac ICU", lat: 18.5105, lng: 73.9268, phone: "020 6628 5000" },
  { id: 3, name: "Ruby Hall Clinic", type: "Cardiac ICU", lat: 18.5334, lng: 73.8772, phone: "020 6645 5100" },
  { id: 4, name: "Sahyadri Super Speciality", type: "General ER", lat: 18.5158, lng: 73.9445, phone: "020 6721 3000" },
  { id: 5, name: "Sancheti Hospital", type: "Stroke Center", lat: 18.5283, lng: 73.8524, phone: "020 2899 9999" },
  { id: 6, name: "Deenanath Mangeshkar", type: "General ER", lat: 18.5020, lng: 73.8322, phone: "020 4015 1000" },
  { id: 7, name: "Jupiter Hospital", type: "General ER", lat: 18.5639, lng: 73.7784, phone: "020 2790 2790" },
  { id: 8, name: "Aditya Birla Memorial", type: "Cardiac ICU", lat: 18.6258, lng: 73.7747, phone: "020 3071 7777" }
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

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    const { data: docs } = await supabase.from('profiles').select('id, full_name, rating').eq('role', 'doctor').order('rating', { ascending: false }); 
    if (docs) setDoctorsList(docs);
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

  const loginToGoogleFit = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setLoading(true);
        const fitData = await fetchGoogleFitData(tokenResponse.access_token);
        setInputs(prev => ({ ...prev, steps: fitData.steps, heart_rate: fitData.heartRate, spo2: fitData.spo2, systolic_bp: fitData.systolic, diastolic_bp: fitData.diastolic }));
        alert("Google Fit Data Synced!");
      } catch (err) { alert("Sync failed."); } finally { setLoading(false); }
    },
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

  const handleAnalyze = async () => {
    setLoading(true); setResult(null); setShowHospitals(false); setSendSuccess(false);
    try {
      const res = await fetch("http://127.0.0.1:5000/predict", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(inputs) });
      const data = await res.json();
      setResult(data);
      if (data.triage_result === 'HIGH') handleFindHospital();
    } catch (e) { alert("AI Service Offline"); } finally { setLoading(false); }
  };

  // 🚀 SEND TO DOCTOR LOGIC
  const handleSendToDoctor = async () => {
    if (!selectedDoctorId) { alert("Please select a doctor first."); return; }
    setIsSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('medical_reports').insert([{ 
        patient_id: user.id, 
        doctor_id: selectedDoctorId, 
        vitals: inputs, 
        ai_summary: result.deep_analysis?.simple_summary || "Automated analysis completed.", 
        risk_level: result.triage_result || "LOW", 
        status: "Pending Review" 
      }]);
      if (error) throw error;
      setSendSuccess(true);
    } catch (e) { alert("Error sending report."); } finally { setIsSending(false); }
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
              {['heart_rate', 'spo2', 'systolic_bp', 'steps'].map(k => (
                <div key={k} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">{k.replace('_', ' ')}</span>
                  <div className="flex items-baseline gap-2">
                    <input type="number" value={inputs[k]} onChange={e => setInputs({...inputs, [k]: e.target.value})} className="serif text-4xl w-full bg-transparent border-none outline-none text-slate-900"/>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8 space-y-8">
                {result ? (
                  <>
                    <div className={`p-10 rounded-[40px] border-l-[16px] shadow-xl bg-white ${result.triage_result === 'HIGH' ? 'border-red-500' : 'border-emerald-500'}`}>
                      <h2 className="serif text-6xl text-slate-900 mb-4 tracking-tight uppercase">{result.triage_result} RISK</h2>
                      <p className="text-slate-400 font-medium text-lg leading-relaxed italic mb-8">"{result.deep_analysis?.simple_summary}"</p>
                      <button onClick={handleAnalyze} className="bg-slate-900 text-white px-8 py-5 rounded-2xl font-bold flex items-center gap-3 hover:bg-slate-800 transition-all shadow-lg">
                        <RefreshCw size={20} className={loading ? "animate-spin" : ""}/> Refresh Analysis
                      </button>
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
                  <h4 className="serif text-4xl mb-6 text-slate-900 italic tracking-tight leading-none">"{report.ai_summary}"</h4>
                </div>
                <div className="md:w-80 bg-slate-50 rounded-[32px] p-8 border border-slate-100 flex flex-col justify-between">
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Physician Note</h5>
                  {report.status === 'Verified' ? (
                    <p className="text-sm font-medium text-slate-600 leading-relaxed italic">"{report.doctor_notes}"</p>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-4 text-slate-300 h-full"><Clock size={32} className="animate-pulse"/><p className="text-[10px] font-bold uppercase tracking-widest">Awaiting Verification</p></div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default PatientDashboard;