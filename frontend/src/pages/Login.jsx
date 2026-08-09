import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import supabase from "../services/supabase";
import { Activity, Mail, Lock, ArrowRight, Loader2, ShieldCheck, Eye, EyeOff } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  
  // -- EXISTING LOGIC STATE --
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // -- NEW UI STATE --
  const [showPassword, setShowPassword] = useState(false);

  // -- EXISTING AUTHENTICATION LOGIC --
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
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-white font-plus overflow-hidden relative">
      {/* Google Fonts and styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Outfit:wght@400;500;600;700;800&display=swap');
        .font-plus { font-family: 'Plus Jakarta Sans', sans-serif; }
        .font-outfit { font-family: 'Outfit', sans-serif; }
      `}</style>

      {/* ── THE DROP-DOWN SECURE BADGE (Encrypted Connection) ── */}
      <div 
        className={`fixed top-8 left-1/2 lg:left-3/4 -translate-x-1/2 z-50 flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-5 py-2.5 rounded-full text-sm font-semibold shadow-lg transition-all duration-500 ${
          loading ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-12 pointer-events-none'
        }`}
      >
        <Loader2 size={18} className="animate-spin text-emerald-600" />
        Establishing encrypted connection...
      </div>

      {/* ── LEFT SIDE: PREMIUM MEDICAL BANNER IMAGE ── */}
      <div className="hidden lg:block lg:col-span-6 xl:col-span-7 relative h-screen bg-slate-50 select-none">
        <img 
          src="/login-banner.jpg" 
          alt="Medical Stethoscope Banner" 
          className="w-full h-full object-cover"
        />
        {/* Soft overlay gradient to blend with the wave */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-white/10" />
      </div>

      {/* ── RIGHT SIDE: THE LOGIN FORM CONTAINER ── */}
      <div className="col-span-1 lg:col-span-6 xl:col-span-5 flex flex-col justify-center px-8 sm:px-16 lg:px-20 py-12 h-screen overflow-y-auto bg-white">
        <div className="max-w-md w-full mx-auto">
          
          {/* Brand Logo */}
          <div className="flex items-center gap-2 mb-8">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#005A51" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#005A51]">
              <path d="M3 10.5L12 3l9 7.5V20a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <line x1="12" y1="9" x2="12" y2="15" />
              <line x1="9" y1="12" x2="15" y2="12" />
            </svg>
            <span className="text-2xl font-extrabold text-slate-900 tracking-tight font-outfit">MedAI</span>
          </div>

          {/* Form Header */}
          <header className="mb-8">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-outfit">Welcome Back</h1>
            <p className="mt-2 text-slate-500 font-semibold text-sm">Access your health dashboard securely.</p>
          </header>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            
            {/* Email Field */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700">Email Address</label>
              <div className="relative flex items-center">
                <Mail className="absolute left-4 text-slate-400" size={18} />
                <input
                  type="email"
                  placeholder="clinician@pulsecare.com"
                  className="w-full pl-11 pr-8 py-3.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#005A51] focus:ring-2 focus:ring-[#005A51]/10 transition-all font-semibold text-slate-800 placeholder:text-slate-400/90 text-sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
                <span className="absolute -right-3 text-rose-500 font-extrabold text-lg">•</span>
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700">Password</label>
              <div className="relative flex items-center">
                <Lock className="absolute left-4 text-slate-400" size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-12 py-3.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#005A51] focus:ring-2 focus:ring-[#005A51]/10 transition-all font-semibold text-slate-800 placeholder:text-slate-400/90 text-sm"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex justify-between items-center text-sm font-semibold">
              <label className="flex items-center gap-2 text-slate-600 cursor-pointer">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded border-slate-300 text-[#005A51] focus:ring-[#005A51]"
                />
                <span>Remember me</span>
              </label>
              <a href="#forgot" className="text-[#005A51] hover:underline">Forgot password?</a>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 text-rose-600 bg-rose-50 p-4 rounded-xl border border-rose-100">
                <ShieldCheck size={18} />
                <p className="text-sm font-bold">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#005A51] hover:bg-[#004D45] text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 mt-8 shadow-sm hover:shadow-md text-sm active:scale-[0.99] disabled:opacity-70 disabled:cursor-wait"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Authenticating...
                </>
              ) : (
                <>
                  Sign In <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Replaced yellow box content "Contact your administrator" with "Register here" */}
          <div className="mt-8 text-center text-sm font-semibold text-slate-500">
            Don't have an account? <Link to="/signup" className="text-[#005A51] hover:underline font-extrabold ml-1">Register here</Link>
          </div>
        </div>
      </div>
    </div>
  );
}