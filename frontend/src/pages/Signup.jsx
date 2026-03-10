import { useState } from "react";
import supabase from "../services/supabase";
import { useNavigate, Link } from "react-router-dom";
import { Activity, Mail, Lock, UserCog, User, ArrowRight } from "lucide-react";

export default function Signup() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("patient");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

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
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-white selection:bg-blue-100 overflow-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');
        .serif { font-family: 'Instrument Serif', serif; }
        .plus-jakarta { font-family: 'Plus Jakarta Sans', sans-serif; }
      `}</style>

      {/* ── LEFT SIDE: INTERACTION ── */}
      <div className="flex flex-col justify-between p-10 lg:p-20 bg-white order-2 lg:order-1">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2.5 rounded-xl shadow-lg shadow-blue-100">
            <Activity className="text-white" size={24} />
          </div>
          <span className="serif text-3xl text-slate-900 tracking-tight">MedAI</span>
        </div>

        <div className="max-w-md w-full mx-auto">
          <header className="mb-10">
            <h1 className="serif text-6xl text-slate-900 mb-4 leading-none tracking-tight">Join Us.</h1>
            <p className="plus-jakarta text-slate-500 font-medium">Create your secure clinical or patient profile.</p>
          </header>

          {error && <p className="mb-6 p-4 bg-red-50 text-red-600 text-sm font-bold rounded-xl border border-red-100 italic">! {error}</p>}

          <form onSubmit={handleSignup} className="space-y-5">
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] ml-1">Legal Name</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
                <input
                  type="text"
                  placeholder="John Doe"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-blue-600 transition-all font-medium text-slate-800"
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] ml-1">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
                <input
                  type="email"
                  placeholder="name@medai.com"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-blue-600 transition-all font-medium text-slate-800"
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] ml-1">Security Key</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-blue-600 transition-all font-medium text-slate-800"
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] ml-1">Profile Role</label>
              <div className="relative group">
                <UserCog className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
                <select
                  className="w-full pl-12 pr-10 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-blue-600 transition-all font-bold text-slate-800 appearance-none cursor-pointer"
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="patient">Patient Account</option>
                  <option value="doctor">Licensed Physician</option>
                </select>
              </div>
            </div>

            <button
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-blue-600 text-white font-bold py-5 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl hover:-translate-y-1 disabled:opacity-50"
            >
              {loading ? "PROCESSING..." : "REGISTER ACCOUNT"} <ArrowRight size={20} />
            </button>
          </form>

          <div className="mt-8 text-center text-sm font-semibold text-slate-400">
            Already have an account? <Link to="/login" className="text-blue-600 hover:underline">Sign In</Link>
          </div>
        </div>

        <div className="text-[10px] font-bold text-slate-300 uppercase tracking-widest flex items-center gap-4">
          <span>SECURED ECOSYSTEM</span>
          <div className="w-1.5 h-1.5 bg-slate-200 rounded-full" />
          <span>V1.2.0</span>
        </div>
      </div>

      {/* ── RIGHT SIDE: DIAGNOSTIC IMAGE ── */}
      <div className="hidden lg:block relative overflow-hidden bg-slate-100 order-1 lg:order-2">
        <img 
          src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?q=80&w=2070&auto=format&fit=crop" 
          alt="Medical Precision"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent" />
        
        <div className="absolute bottom-0 left-0 right-0 p-20 text-white">
          <div className="mb-8 bg-blue-500 w-16 h-1 rounded-full" />
          <h2 className="serif text-7xl leading-[0.95] mb-10 tracking-tight">
            The standard in <br />
            <span className="italic text-blue-400">vital risk analysis.</span>
          </h2>
          <div className="flex items-center gap-5 opacity-60">
            <div className="w-10 h-10 rounded-full border border-white/30 flex items-center justify-center">
              <Activity size={16} />
            </div>
            <p className="plus-jakarta text-[10px] font-bold uppercase tracking-[0.3em]">
              MedAI Diagnostic Intelligence
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}