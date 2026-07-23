import { useState } from "react";
import { 
  HeartPulse, Activity, AlertOctagon, Phone, 
  MapPin, Pill, Bell, CheckCircle, LogOut, Clock
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import supabase from "../services/supabase";

export default function CaregiverDashboard() {
  const navigate = useNavigate();
  const [patients] = useState([
    {
      id: "P-101",
      name: "Ramesh Sharma",
      relation: "Father",
      age: 68,
      status: "Stable",
      lastReading: { hr: 72, spo2: 97, bp: "120/80" },
      medications: [
        { name: "Amlodipine 5mg", time: "08:00 AM", taken: true },
        { name: "Metformin 500mg", time: "08:00 PM", taken: false, lowStock: true }
      ],
      alerts: [
        { id: 1, type: "warning", message: "Metformin running low (3 days left)" }
      ]
    }
  ]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        .serif { font-family: 'Instrument Serif', serif; }
      `}</style>
      
      <aside className="hidden lg:flex flex-col w-72 bg-white border-r border-slate-200 p-8 fixed h-full">
        <div className="flex items-center gap-3 mb-12">
          <div className="bg-purple-600 p-2 rounded-xl shadow-lg"><HeartPulse className="text-white" size={24} /></div>
          <span className="serif text-2xl">CareSync</span>
        </div>
        <nav className="flex-1 space-y-2">
          <button className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-900 text-white shadow-sm font-bold text-sm">
            <div className="flex items-center gap-3"><Activity size={20}/> Monitoring</div>
          </button>
        </nav>
        <button onClick={handleLogout} className="flex items-center gap-3 p-4 text-slate-400 font-bold text-sm hover:text-red-500 transition-colors"><LogOut size={20}/> Sign Out</button>
      </aside>

      <main className="flex-1 lg:ml-72 p-8 md:p-12 w-full animate-in fade-in duration-500">
        <header className="mb-12">
          <h1 className="serif text-6xl text-slate-900 mb-2 tracking-tight">Family Portal</h1>
          <p className="text-slate-500 font-medium tracking-tight">Real-time health monitoring and medication alerts for your loved ones.</p>
        </header>

        <div className="space-y-8">
          {patients.map(patient => (
            <div key={patient.id} className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-xl">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="serif text-4xl text-slate-900">{patient.name}</h2>
                  <p className="text-slate-400 font-bold text-sm">{patient.relation} • {patient.age} yrs</p>
                </div>
                <div className={`px-4 py-2 rounded-full font-black text-[10px] uppercase tracking-widest ${patient.status === 'Stable' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                  Condition: {patient.status}
                </div>
              </div>

              {patient.alerts.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 mb-8 flex items-start gap-4">
                  <Bell className="text-amber-500 flex-shrink-0" size={24}/>
                  <div>
                    <h4 className="font-bold text-amber-900 mb-2">Active Alerts</h4>
                    {patient.alerts.map(a => (
                      <p key={a.id} className="text-sm text-amber-700 flex items-center gap-2"><AlertOctagon size={16}/> {a.message}</p>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Latest Heart Rate</span>
                  <div className="flex items-baseline gap-2">
                    <span className="serif text-4xl text-slate-900">{patient.lastReading.hr}</span>
                    <span className="text-xs font-bold text-slate-400">BPM</span>
                  </div>
                </div>
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Latest SpO2</span>
                  <div className="flex items-baseline gap-2">
                    <span className="serif text-4xl text-slate-900">{patient.lastReading.spo2}</span>
                    <span className="text-xs font-bold text-slate-400">%</span>
                  </div>
                </div>
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Latest BP</span>
                  <div className="flex items-baseline gap-2">
                    <span className="serif text-4xl text-slate-900">{patient.lastReading.bp}</span>
                    <span className="text-xs font-bold text-slate-400">mmHg</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="serif text-3xl text-slate-800 mb-6 flex items-center gap-3"><Pill size={28} className="text-purple-500"/> Today's Medication</h3>
                <div className="grid gap-4">
                  {patient.medications.map((med, i) => (
                    <div key={i} className="flex justify-between items-center p-6 bg-white border border-slate-100 shadow-sm rounded-[24px]">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-full ${med.taken ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                          {med.taken ? <CheckCircle size={20}/> : <Clock size={20}/>}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{med.name}</p>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{med.time}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {med.lowStock && <span className="bg-red-50 text-red-600 px-3 py-1 rounded-lg text-xs font-bold">Low Stock!</span>}
                        {med.taken ? (
                          <span className="text-emerald-500 font-bold text-sm">Taken</span>
                        ) : (
                          <button className="bg-slate-100 text-slate-500 px-4 py-2 rounded-lg font-bold text-sm hover:bg-slate-200">Send Reminder</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
