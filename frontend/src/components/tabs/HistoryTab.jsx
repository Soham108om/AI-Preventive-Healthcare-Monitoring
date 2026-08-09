// HistoryTab.jsx — Clinical Records Tab
// Extracted from PatientDashboard.jsx to keep each concern in its own file.
import { RefreshCw, CheckCircle, Clock } from "lucide-react";

const HistoryTab = ({ historyReports, loadingHistory }) => (
  <div className="space-y-8 animate-in fade-in duration-300">
    <div>
      <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-outfit">Clinical History</h1>
      <p className="mt-1 text-slate-500 font-semibold text-sm">Archived medical summaries, diagnostic charts, and verified notes.</p>
    </div>

    {loadingHistory ? (
      <div className="flex justify-center py-20 text-[#005A51]">
        <RefreshCw size={36} className="animate-spin" />
      </div>
    ) : historyReports.length === 0 ? (
      <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center text-slate-400 font-semibold text-sm">
        No archived reports found. Perform triage analyses to build history.
      </div>
    ) : (
      <div className="space-y-4">
        {historyReports.map(report => (
          <div key={report.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col md:flex-row justify-between gap-6 hover:border-slate-200 transition-all duration-200">
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-0.5 rounded-full font-black text-[9px] uppercase tracking-wider border ${
                  report.risk_level === 'HIGH'
                    ? 'bg-rose-50 border-rose-200 text-rose-600'
                    : report.risk_level === 'LOW'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                      : 'bg-amber-50 border-amber-200 text-amber-600'
                }`}>
                  {report.risk_level} Risk
                </span>
                <span className="text-[10px] font-bold text-slate-400 tracking-wider">
                  {new Date(report.created_at).toLocaleDateString()} at {new Date(report.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <h4 className="text-base font-bold text-slate-800 leading-snug">
                "{report.ai_summary}"
              </h4>
            </div>

            <div className="md:w-72 bg-slate-50/50 rounded-xl p-4 border border-slate-100/60 flex flex-col justify-between text-xs">
              <div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Physician Sign-off</span>
                {report.status === 'Verified' ? (
                  <p className="text-slate-600 font-semibold italic leading-relaxed">"{report.doctor_notes}"</p>
                ) : (
                  <div className="flex items-center gap-1.5 text-slate-400 font-semibold py-2">
                    <Clock size={12} className="animate-pulse" />
                    <span>Awaiting Review</span>
                  </div>
                )}
              </div>
              {report.status === 'Verified' && (
                <div className="flex items-center gap-1.5 pt-3 mt-3 border-t border-slate-200/50 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                  <CheckCircle size={10} className="text-emerald-600" />
                  <span>Digitally Signed</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

export default HistoryTab;
