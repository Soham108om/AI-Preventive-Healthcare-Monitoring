import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import supabase from "../services/supabase";
import { Activity, Mail, Lock, ArrowRight } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", authData.user.id)
      .single();

    if (profileError || !profile) {
      setError("Clinical profile not found. Access denied.");
      setLoading(false);
      return;
    }

    if (profile.role === "doctor") {
      navigate("/doctor");
    } else {
      navigate("/patient");
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-white selection:bg-blue-100 overflow-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');
        .serif { font-family: 'Instrument Serif', serif; }
        .plus-jakarta { font-family: 'Plus Jakarta Sans', sans-serif; }
      `}</style>

      {/* ── LEFT SIDE: THE INTERACTION ── */}
      <div className="flex flex-col justify-between p-10 lg:p-24 bg-white">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2.5 rounded-xl shadow-lg shadow-blue-100">
            <Activity className="text-white" size={24} />
          </div>
          <span className="serif text-3xl text-slate-900 tracking-tight">MedAI</span>
        </div>

        <div className="max-w-md w-full mx-auto">
          <header className="mb-12">
            <h1 className="serif text-6xl text-slate-900 mb-4 leading-none tracking-tight">Welcome back.</h1>
            <p className="plus-jakarta text-slate-500 font-medium">Please authorize to access your secure portal.</p>
          </header>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-extrabold text-blue-600 uppercase tracking-[0.2em] ml-1">Secure Email</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                <input
                  type="email"
                  placeholder="name@medai.com"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-blue-600 transition-all font-medium text-slate-800"
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] ml-1">Password</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-blue-600 transition-all font-medium text-slate-800"
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {error && <p className="text-red-500 text-sm font-bold ml-1">! {error}</p>}

            <button
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-blue-600 text-white font-bold py-5 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl hover:-translate-y-1 disabled:opacity-50"
            >
              {loading ? "AUTHENTICATING..." : "AUTHORIZE ACCESS"} <ArrowRight size={20} />
            </button>
          </form>

          <div className="mt-10 pt-10 border-t border-slate-100 text-center text-sm font-semibold text-slate-400">
            Don't have an account? <Link to="/signup" className="text-blue-600 hover:underline">Register</Link>
          </div>
        </div>

        <div className="text-[10px] font-bold text-slate-300 uppercase tracking-widest flex items-center gap-4">
          <span>HIPAA COMPLIANT</span>
          <div className="w-1.5 h-1.5 bg-slate-200 rounded-full" />
          <span>DPDP SECURE</span>
        </div>
      </div>

      {/* ── RIGHT SIDE: PREMIUM PRODUCTION IMAGE ── */}
      <div className="hidden lg:block relative overflow-hidden bg-slate-50">
        {/* NEW IMAGE: High-end medical equipment/environment for a sterile, production feel */}
        <img 
          src="https://images.unsplash.com/photo-1516549655169-df83a0774514?q=80&w=2070&auto=format&fit=crop" 
          alt="Production Medical Environment"
          className="absolute inset-0 w-full h-full object-cover grayscale-[0.3] hover:scale-105 transition-transform duration-1000"
        />
        
        {/* Soft, clean gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />
        
        <div className="absolute bottom-0 left-0 right-0 p-20 text-white">
          <div className="mb-8 bg-blue-500 w-16 h-1 rounded-full shadow-lg shadow-blue-500/50" />
          
          <h2 className="serif text-7xl leading-[0.95] mb-10 tracking-tight">
            Advanced care through <br />
            <span className="italic text-blue-400">clinical intelligence.</span>
          </h2>
          
          <div className="flex items-center gap-5">
            <div className="w-10 h-10 rounded-full border border-white/30 flex items-center justify-center bg-white/5 backdrop-blur-sm">
              <Activity size={16} />
            </div>
            <p className="plus-jakarta text-[10px] font-bold uppercase tracking-[0.3em] opacity-60">
              Universal Health Ecosystem v1.2
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}