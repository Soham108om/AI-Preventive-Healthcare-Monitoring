import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import supabase from "../services/supabase";
import MedAILogo from "../components/MedAILogo";
import { Mail, Lock, ArrowRight, Loader2, ShieldCheck, Eye, EyeOff, CheckCircle2 } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  
  // -- EXISTING LOGIC STATE --
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // -- UI STATE --
  const [showPassword, setShowPassword] = useState(false);

  // -- AUTHENTICATION LOGIC --
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
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
    } catch (err) {
      console.error("Network or authentication error:", err);
      setError("Unable to connect to authentication server. Please check your internet connection or verify if your Supabase project is active/unpaused.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-white font-plus overflow-hidden">
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Outfit:wght@400;500;600;700;800&display=swap');
        .font-plus { font-family: 'Plus Jakarta Sans', sans-serif; }
        .font-outfit { font-family: 'Outfit', sans-serif; }
      `}</style>

      {/* ── DROP-DOWN ENCRYPTED CONNECTION BADGE ── */}
      <div 
        className={`fixed top-8 left-1/2 lg:left-3/4 -translate-x-1/2 z-50 flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-5 py-2.5 rounded-full text-sm font-semibold shadow-lg transition-all duration-500 ${
          loading ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-12 pointer-events-none'
        }`}
      >
        <Loader2 size={18} className="animate-spin text-emerald-600" />
        Establishing encrypted connection...
      </div>

      {/* ── LEFT HERO BANNER (50% Split on Desktop) ── */}
      <div className="hidden lg:col-span-6 lg:flex flex-col justify-between p-12 lg:p-16 relative bg-[#004D45] overflow-hidden select-none">
        {/* Background Image with Dark Teal Overlay */}
        <div className="absolute inset-0 z-0">
          <img 
            src="/login-banner.jpg" 
            alt="Medical Dashboard Preview" 
            className="w-full h-full object-cover object-center opacity-30 mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-[#003832] via-[#004D45]/90 to-[#005A51]/80" />
        </div>

        {/* Top: Brand Logo */}
        <div className="relative z-10">
          <MedAILogo to="/" variant="light" size="lg" />
        </div>

        {/* Center Content: Headline & Subheading */}
        <div className="relative z-10 max-w-lg my-auto py-12 space-y-6">
          <h1 className="text-4xl xl:text-5xl font-extrabold text-white leading-[1.15] tracking-tight font-outfit">
            Intelligent healthcare, designed around you.
          </h1>
          <p className="text-emerald-100/80 text-base xl:text-lg font-normal leading-relaxed">
            Securely connect to your health dashboard and make smarter decisions with AI-powered insights.
          </p>
        </div>

        {/* Bottom: Security & Compliance Badges */}
        <div className="relative z-10 flex items-center gap-8 pt-6 border-t border-emerald-600/30">
          <div className="flex items-center gap-2 text-emerald-100/90 text-sm font-medium">
            <Lock size={16} className="text-emerald-300" />
            <span>End-to-end encrypted</span>
          </div>
          <div className="flex items-center gap-2 text-emerald-100/90 text-sm font-medium">
            <CheckCircle2 size={16} className="text-emerald-300" />
            <span>HIPAA Compliant</span>
          </div>
        </div>
      </div>

      {/* ── RIGHT FORM PANEL (50% Split on Desktop) ── */}
      <div className="col-span-1 lg:col-span-6 flex flex-col justify-between px-6 sm:px-12 xl:px-20 py-10 min-h-screen bg-white">
        
        {/* Mobile Header Brand Logo (Visible only on mobile/tablet) */}
        <div className="lg:hidden flex items-center mb-6">
          <MedAILogo to="/" size="md" />
        </div>

        {/* Main Form Center Box */}
        <div className="max-w-md w-full mx-auto my-auto space-y-8 py-6">
          
          {/* Header */}
          <header className="space-y-2">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight font-outfit">
              Welcome back
            </h2>
            <p className="text-slate-500 font-medium text-sm sm:text-base">
              Access your health dashboard securely.
            </p>
          </header>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-700">Email Address</label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3.5 text-slate-400" size={18} />
                <input
                  type="email"
                  placeholder="clinician@pulsecare.com"
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#005A51] focus:ring-2 focus:ring-[#005A51]/15 transition-all text-slate-800 placeholder:text-slate-400 text-sm font-medium"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-700">Password</label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 text-slate-400" size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#005A51] focus:ring-2 focus:ring-[#005A51]/15 transition-all text-slate-800 placeholder:text-slate-400 text-sm font-medium"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between text-sm pt-1">
              <label className="flex items-center gap-2 text-slate-600 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded border-slate-300 text-[#005A51] focus:ring-[#005A51] accent-[#005A51]"
                />
                <span className="font-medium text-slate-600">Remember me</span>
              </label>
              <a href="#forgot" className="text-[#005A51] hover:text-[#00433C] font-semibold hover:underline">
                Forgot password?
              </a>
            </div>

            {/* Error Display */}
            {error && (
              <div className="flex items-center gap-2.5 text-rose-600 bg-rose-50 p-3.5 rounded-xl border border-rose-100 text-sm font-medium">
                <ShieldCheck size={18} className="shrink-0 text-rose-500" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#005A51] hover:bg-[#004840] text-white font-semibold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 mt-6 shadow-sm hover:shadow-md text-sm active:scale-[0.99] disabled:opacity-70 disabled:cursor-wait"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Authenticating...
                </>
              ) : (
                <>
                  Sign In <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Registration Redirect */}
          <div className="text-center text-sm font-medium text-slate-500 pt-2">
            Don't have an account?{" "}
            <Link to="/signup" className="text-[#005A51] hover:text-[#00433C] font-semibold hover:underline">
              Register here
            </Link>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center text-xs text-slate-400 font-normal py-4">
          © 2024 MedAI. Precision Healthcare Systems.
        </footer>
      </div>
    </div>
  );
}