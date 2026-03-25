import { useState } from "react";
import supabase from "../services/supabase";
import { useNavigate, Link } from "react-router-dom";
import { Activity, Mail, Lock, UserCog, User, ArrowRight, Loader2, ShieldCheck, ChevronDown } from "lucide-react";

export default function Signup() {
  const navigate = useNavigate();

  // -- EXISTING LOGIC STATE --
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("patient");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // -- NEW UI STATE --
  const [focusedField, setFocusedField] = useState(null);

  // -- EXISTING AUTHENTICATION LOGIC --
  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signupError) {
      setError(signupError.message);
      setLoading(false);
      return;
    }

    const user = data.user;
    if (!user) {
      setError("Please verify your email.");
      setLoading(false);
      return;
    }

    const { error: profileError } = await supabase.from("profiles").insert({
      id: user.id,
      full_name: fullName,
      role: role,
    });

    if (profileError) {
      setError(profileError.message);
      setLoading(false);
      return;
    }

    navigate("/login");
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-slate-50 overflow-hidden relative">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .serif { font-family: 'Instrument Serif', serif; }
        .plus-jakarta { font-family: 'Plus Jakarta Sans', sans-serif; }
      `}</style>

      {/* ── THE DROP-DOWN SECURE BADGE (Matches Login) ── */}
      <div 
        className={`absolute top-8 left-1/2 lg:left-1/4 -translate-x-1/2 z-50 flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-5 py-2.5 rounded-full text-sm font-semibold shadow-lg transition-all duration-500 ${
          loading ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-12'
        }`}
      >
        <Loader2 size={18} className="animate-spin text-emerald-600" />
        Provisioning secure clinical profile...
      </div>

      {/* ── LEFT SIDE: THE INTERACTION ── */}
      <div className="flex flex-col justify-between p-10 lg:p-24 bg-white relative z-10 shadow-[20px_0_60px_-15px_rgba(0,0,0,0.05)] overflow-y-auto">
        
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="bg-teal-700 p-2.5 rounded-xl shadow-lg shadow-teal-700/20">
            <Activity className="text-white" size={24} strokeWidth={2.5} />
          </div>
          <span className="plus-jakarta font-extrabold text-2xl text-slate-900 tracking-tight">MedAI</span>
        </div>

        {/* Main Form Container */}
        <div className="max-w-md w-full mx-auto my-auto py-12">
          <header className="mb-10">
            <h1 className="serif text-6xl text-slate-900 mb-4 leading-none tracking-tight">Join Us.</h1>
            <p className="plus-jakarta text-slate-500 font-medium text-lg">Create your secure clinical or patient profile.</p>
          </header>

          <form onSubmit={handleSignup} className="space-y-5 plus-jakarta">
            
            {/* Reactive Name Field */}
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 ml-1">Legal Name</label>
              <div className="relative group">
                <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors duration-300 ${focusedField === 'name' ? 'text-teal-600' : 'text-slate-400'}`}>
                  <User size={20} className={`transition-transform duration-300 ${focusedField === 'name' ? 'scale-110' : 'scale-100'}`} />
                </div>
                <input
                  type="text"
                  placeholder="John Doe"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-teal-600/10 focus:border-teal-600 transition-all font-medium text-slate-900 placeholder:text-slate-400"
                  onChange={(e) => setFullName(e.target.value)}
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField(null)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            {/* Reactive Email Field */}
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 ml-1">Email Address</label>
              <div className="relative group">
                <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors duration-300 ${focusedField === 'email' ? 'text-teal-600' : 'text-slate-400'}`}>
                  <Mail size={20} className={`transition-transform duration-300 ${focusedField === 'email' ? 'scale-110' : 'scale-100'}`} />
                </div>
                <input
                  type="email"
                  placeholder="name@medai.com"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-teal-600/10 focus:border-teal-600 transition-all font-medium text-slate-900 placeholder:text-slate-400"
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            {/* Reactive Password Field */}
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 ml-1">Security Key</label>
              <div className="relative group">
                <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors duration-300 ${focusedField === 'password' ? 'text-teal-600' : 'text-slate-400'}`}>
                  <Lock size={20} className={`transition-transform duration-300 ${focusedField === 'password' ? 'scale-110' : 'scale-100'}`} />
                </div>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-teal-600/10 focus:border-teal-600 transition-all font-medium text-slate-900 placeholder:text-slate-400"
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            {/* Reactive Role Select */}
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 ml-1">Profile Role</label>
              <div className="relative group">
                <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors duration-300 ${focusedField === 'role' ? 'text-teal-600' : 'text-slate-400'}`}>
                  <UserCog size={20} className={`transition-transform duration-300 ${focusedField === 'role' ? 'scale-110' : 'scale-100'}`} />
                </div>
                <select
                  className="w-full pl-12 pr-10 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-teal-600/10 focus:border-teal-600 transition-all font-bold text-slate-900 appearance-none cursor-pointer disabled:opacity-50"
                  onChange={(e) => setRole(e.target.value)}
                  onFocus={() => setFocusedField('role')}
                  onBlur={() => setFocusedField(null)}
                  disabled={loading}
                >
                  <option value="patient">Patient Account</option>
                  <option value="doctor">Licensed Physician</option>
                </select>
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
                  <ChevronDown size={20} />
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 text-rose-600 bg-rose-50 p-4 rounded-xl border border-rose-100 animate-in fade-in slide-in-from-top-2">
                <ShieldCheck size={18} />
                <p className="text-sm font-bold">{error}</p>
              </div>
            )}

            {/* Morphing Submit Button */}
            <button
              disabled={loading}
              className={`w-full mt-2 text-white font-bold py-4 rounded-2xl transition-all duration-300 flex items-center justify-center gap-3 shadow-lg hover:-translate-y-0.5 active:scale-[0.98] ${
                loading ? 'bg-teal-600 cursor-wait' : 'bg-teal-700 hover:bg-teal-800 hover:shadow-teal-700/25'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" /> PROCESSING...
                </>
              ) : (
                <>
                  REGISTER ACCOUNT <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-slate-100 text-center text-sm font-semibold text-slate-500 plus-jakarta">
            Already have an account? <Link to="/login" className="text-teal-600 hover:text-teal-700 hover:underline underline-offset-4">Sign In</Link>
          </div>
        </div>

        {/* Footer Trust Badges */}
        <div className="plus-jakarta text-[11px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-4">
          <span className="flex items-center gap-1.5"><ShieldCheck size={14} /> SECURED ECOSYSTEM</span>
          <div className="w-1 h-1 bg-slate-300 rounded-full" />
          <span>V1.2.0</span>
        </div>
      </div>

      {/* ── RIGHT SIDE: PREMIUM PRODUCTION IMAGE ── */}
      <div className="hidden lg:block relative overflow-hidden bg-slate-900">
        <img 
          src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?q=80&w=2070&auto=format&fit=crop" 
          alt="Medical Precision"
          className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-luminosity hover:scale-105 hover:opacity-80 transition-all duration-1000"
        />
        
        {/* MedAI Teal Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-teal-900/40 to-transparent" />
        
        <div className="absolute bottom-0 left-0 right-0 p-20 text-white z-10">
          <div className="mb-8 bg-teal-500 w-16 h-1 rounded-full shadow-[0_0_15px_rgba(20,184,166,0.5)]" />
          
          <h2 className="serif text-7xl leading-[0.95] mb-8 tracking-tight text-white">
            The standard in <br />
            <span className="italic text-teal-300">vital risk analysis.</span>
          </h2>
          
          <div className="flex items-center gap-4 border border-white/10 bg-white/5 backdrop-blur-md w-fit px-5 py-3 rounded-full">
            <Activity size={16} className="text-teal-400" />
            <p className="plus-jakarta text-xs font-bold uppercase tracking-[0.2em] text-slate-200">
              MedAI Diagnostic Intelligence
            </p>
          </div>
        </div>
      </div>
      
    </div>
  );
}