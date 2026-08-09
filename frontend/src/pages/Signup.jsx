import { useState } from "react";
import supabase from "../services/supabase";
import { useNavigate, Link } from "react-router-dom";
import { 
  Activity, Mail, Lock, UserCog, User, ArrowRight, Loader2, 
  ShieldCheck, ChevronDown, Heart, Dumbbell, CalendarDays, Eye, EyeOff 
} from "lucide-react";

export default function Signup() {
  const navigate = useNavigate();

  // -- EXISTING LOGIC STATE --
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("patient");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // -- PATIENT PROFILE MODULE STATES --
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [athleteStatus, setAthleteStatus] = useState(false);
  const [sportType, setSportType] = useState("Running");
  const [trainingFrequency, setTrainingFrequency] = useState("Daily");
  const [restingHeartRate, setRestingHeartRate] = useState("");
  const [medicalHistory, setMedicalHistory] = useState({
    Diabetes: false,
    Hypertension: false,
    HeartDisease: false,
    Asthma: false,
    None: true
  });
  const [smoking, setSmoking] = useState("No");
  const [alcohol, setAlcohol] = useState("No");

  // -- NEW UI STATE --
  const [showPassword, setShowPassword] = useState(false);

  // -- PASSWORD STRENGTH LOGIC --
  const getPasswordStrength = (pass) => {
    if (!pass) return { score: 0, label: "", color: "bg-slate-200", text: "text-slate-400" };
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    switch (score) {
      case 0:
      case 1:
        return { score, label: "Weak", color: "bg-rose-500", text: "text-rose-500" };
      case 2:
      case 3:
        return { score, label: "Medium", color: "bg-amber-500", text: "text-amber-500" };
      case 4:
        return { score, label: "Strong", color: "bg-emerald-500", text: "text-emerald-500" };
      default:
        return { score: 0, label: "", color: "bg-slate-200", text: "text-slate-400" };
    }
  };

  // -- EXISTING AUTHENTICATION LOGIC WITH PATIENT PROFILE EXTENSION --
  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // 🩺 LOCAL VALIDATION FOR PATIENT PROFILE
    if (role === "patient") {
      if (!age || parseInt(age) <= 0) {
        setError("Please enter a valid age.");
        setLoading(false);
        return;
      }
      if (!height || parseFloat(height) <= 0) {
        setError("Please enter a valid height (cm).");
        setLoading(false);
        return;
      }
      if (!weight || parseFloat(weight) <= 0) {
        setError("Please enter a valid weight (kg).");
        setLoading(false);
        return;
      }
      if (athleteStatus && (!restingHeartRate || parseInt(restingHeartRate) <= 0)) {
        setError("Please enter a valid resting heart rate (BPM).");
        setLoading(false);
        return;
      }
    }

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
      setError("Please check your email and try logging in.");
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

    // 🩺 INSERT PATIENT PROFILE DATA IF ROLE IS PATIENT
    if (role === "patient") {
      const historyArray = Object.keys(medicalHistory).filter(
        (key) => key !== "None" && medicalHistory[key]
      );
      if (historyArray.length === 0 && medicalHistory.None) {
        historyArray.push("None");
      }

      const { error: patientProfileError } = await supabase
        .from("patient_profile")
        .insert({
          id: user.id,
          age: parseInt(age),
          height: parseFloat(height),
          weight: parseFloat(weight),
          athlete_status: athleteStatus,
          sport_type: athleteStatus ? sportType : null,
          training_frequency: athleteStatus ? trainingFrequency : null,
          resting_heart_rate: athleteStatus ? parseInt(restingHeartRate) : null,
          medical_history: historyArray,
          smoking: smoking === "Yes",
          alcohol: alcohol === "Yes",
        });

      if (patientProfileError) {
        setError("Account created, but profile setup failed: " + patientProfileError.message);
        setLoading(false);
        return;
      }
    }

    navigate("/login");
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-white font-plus overflow-hidden relative">
      {/* Google Fonts and styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Outfit:wght@400;500;600;700;800&display=swap');
        .font-plus { font-family: 'Plus Jakarta Sans', sans-serif; }
        .font-outfit { font-family: 'Outfit', sans-serif; }
      `}</style>

      {/* ── THE DROP-DOWN SECURE BADGE ── */}
      <div 
        className={`fixed top-8 left-1/2 lg:left-3/4 -translate-x-1/2 z-50 flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-5 py-2.5 rounded-full text-sm font-semibold shadow-lg transition-all duration-500 ${
          loading ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-12 pointer-events-none'
        }`}
      >
        <Loader2 size={18} className="animate-spin text-emerald-600" />
        Provisioning secure clinical profile...
      </div>

      {/* ── LEFT SIDE: PREMIUM MEDICAL BANNER IMAGE ── */}
      <div className="hidden lg:block lg:col-span-6 xl:col-span-7 relative h-screen bg-slate-50 select-none">
        <img 
          src="/signup-image.png" 
          alt="Medical Practice Diagnostic Banner" 
          className="w-full h-full object-cover"
        />
        {/* Soft overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-white/10" />
      </div>

      {/* ── RIGHT SIDE: THE SIGNUP FORM CONTAINER ── */}
      <div className="col-span-1 lg:col-span-6 xl:col-span-5 flex flex-col justify-center px-8 sm:px-16 lg:px-20 py-12 h-screen overflow-y-auto bg-white">
        <div className="max-w-md w-full mx-auto my-auto">
          
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
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-outfit">Create Account</h1>
            <p className="mt-2 text-slate-500 font-semibold text-sm">Create your secure clinical or patient profile.</p>
          </header>

          {/* Form */}
          <form onSubmit={handleSignup} className="space-y-6">
            
            {/* Legal Name Field */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700">Legal Name</label>
              <div className="relative flex items-center">
                <User className="absolute left-4 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="John Doe"
                  className="w-full pl-11 pr-8 py-3.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#005A51] focus:ring-2 focus:ring-[#005A51]/10 transition-all font-semibold text-slate-800 placeholder:text-slate-400/90 text-sm"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={loading}
                  required
                />
                <span className="absolute -right-3 text-rose-500 font-extrabold text-lg">•</span>
              </div>
            </div>

            {/* Email Field */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700">Email Address</label>
              <div className="relative flex items-center">
                <Mail className="absolute left-4 text-slate-400" size={18} />
                <input
                  type="email"
                  placeholder="name@medai.com"
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
              <label className="block text-sm font-bold text-slate-700">Security Key</label>
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
                <span className="absolute -right-3 text-rose-500 font-extrabold text-lg">•</span>
              </div>

              {/* Password strength meter */}
              {password && (
                <div className="mt-2 space-y-1.5 px-1 animate-in fade-in duration-200">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-semibold">Password Strength:</span>
                    <span className={`font-bold ${getPasswordStrength(password).text}`}>
                      {getPasswordStrength(password).label}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${getPasswordStrength(password).color}`}
                      style={{ width: `${(getPasswordStrength(password).score / 4) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Role Select */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700">Profile Role</label>
              <div className="relative flex items-center">
                <UserCog className="absolute left-4 text-slate-400" size={18} />
                <select
                  className="w-full pl-11 pr-10 py-3.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#005A51] focus:ring-2 focus:ring-[#005A51]/10 transition-all font-bold text-slate-800 appearance-none cursor-pointer disabled:opacity-50 text-sm"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  disabled={loading}
                >
                  <option value="patient">Patient Account</option>
                  <option value="doctor">Licensed Physician</option>
                </select>
                <div className="absolute right-4 flex items-center pointer-events-none text-slate-400">
                  <ChevronDown size={18} />
                </div>
              </div>
            </div>

            {/* 🩺 PATIENT PERSONALIZED HEALTH PROFILE FIELDS */}
            {role === "patient" && (
              <div className="space-y-6 pt-4 border-t border-slate-100 animate-in fade-in duration-300">
                
                {/* 1. Personal Information Group */}
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-4 shadow-sm">
                  <h3 className="text-sm font-bold text-[#005A51] uppercase tracking-wider border-b border-slate-200/60 pb-2 flex items-center gap-2 font-outfit">
                    <Heart size={16} /> Personal Information
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    
                    {/* Age */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Age</label>
                      <input
                        type="number"
                        placeholder="30"
                        min="1"
                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#005A51] focus:ring-2 focus:ring-[#005A51]/10 transition-all font-semibold text-slate-800 placeholder:text-slate-400/90 text-sm"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        required={role === "patient"}
                        disabled={loading}
                      />
                    </div>

                    {/* Height */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Height (cm)</label>
                      <input
                        type="number"
                        placeholder="175"
                        min="1"
                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#005A51] focus:ring-2 focus:ring-[#005A51]/10 transition-all font-semibold text-slate-800 placeholder:text-slate-400/90 text-sm"
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                        required={role === "patient"}
                        disabled={loading}
                      />
                    </div>

                    {/* Weight */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Weight (kg)</label>
                      <input
                        type="number"
                        placeholder="70"
                        min="1"
                        step="0.1"
                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#005A51] focus:ring-2 focus:ring-[#005A51]/10 transition-all font-semibold text-slate-800 placeholder:text-slate-400/90 text-sm"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        required={role === "patient"}
                        disabled={loading}
                      />
                    </div>

                  </div>
                </div>

                {/* 2. Lifestyle Profile Group */}
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-4 shadow-sm">
                  <h3 className="text-sm font-bold text-[#005A51] uppercase tracking-wider border-b border-slate-200/60 pb-2 flex items-center gap-2 font-outfit">
                    <Dumbbell size={16} /> Lifestyle Profile
                  </h3>

                  {/* Athlete Switch */}
                  <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
                    <input
                      type="checkbox"
                      id="athlete-checkbox"
                      className="w-4.5 h-4.5 rounded text-[#005A51] focus:ring-[#005A51]/10 border-slate-300 accent-[#005A51] cursor-pointer"
                      checked={athleteStatus}
                      onChange={(e) => setAthleteStatus(e.target.checked)}
                      disabled={loading}
                    />
                    <label htmlFor="athlete-checkbox" className="text-sm font-bold text-slate-700 cursor-pointer select-none">
                      Are you an Athlete?
                    </label>
                  </div>

                  {/* Conditional Athlete Fields */}
                  {athleteStatus && (
                    <div className="space-y-4 bg-white border border-teal-100 rounded-xl p-4 animate-in slide-in-from-top-2 duration-200">
                      
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">Sport Type</label>
                        <div className="relative flex items-center">
                          <select
                            className="w-full pl-3 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#005A51] focus:ring-2 focus:ring-[#005A51]/10 transition-all font-bold text-slate-800 appearance-none cursor-pointer text-sm"
                            value={sportType}
                            onChange={(e) => setSportType(e.target.value)}
                            disabled={loading}
                          >
                            <option value="Running">Running</option>
                            <option value="Cycling">Cycling</option>
                            <option value="Swimming">Swimming</option>
                            <option value="Football">Football</option>
                            <option value="Cricket">Cricket</option>
                            <option value="Gym">Gym</option>
                            <option value="Other">Other</option>
                          </select>
                          <div className="absolute right-4 flex items-center pointer-events-none text-slate-400">
                            <ChevronDown size={16} />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">Training Frequency</label>
                        <div className="relative flex items-center">
                          <select
                            className="w-full pl-3 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#005A51] focus:ring-2 focus:ring-[#005A51]/10 transition-all font-bold text-slate-800 appearance-none cursor-pointer text-sm"
                            value={trainingFrequency}
                            onChange={(e) => setTrainingFrequency(e.target.value)}
                            disabled={loading}
                          >
                            <option value="Daily">Daily</option>
                            <option value="3–5 Days/Week">3–5 Days/Week</option>
                            <option value="Occasionally">Occasionally</option>
                          </select>
                          <div className="absolute right-4 flex items-center pointer-events-none text-slate-400">
                            <ChevronDown size={16} />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">Resting Heart Rate (BPM)</label>
                        <input
                          type="number"
                          placeholder="60"
                          min="1"
                          className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#005A51] focus:ring-2 focus:ring-[#005A51]/10 transition-all font-semibold text-slate-800 placeholder:text-slate-400/90 text-sm"
                          value={restingHeartRate}
                          onChange={(e) => setRestingHeartRate(e.target.value)}
                          required={athleteStatus}
                          disabled={loading}
                        />
                      </div>

                    </div>
                  )}

                  {/* Smoking & Alcohol */}
                  <div className="grid grid-cols-2 gap-3">
                    
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Smoking</label>
                      <div className="relative flex items-center">
                        <select
                          className="w-full pl-3 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#005A51] focus:ring-2 focus:ring-[#005A51]/10 transition-all font-bold text-slate-800 appearance-none cursor-pointer text-sm"
                          value={smoking}
                          onChange={(e) => setSmoking(e.target.value)}
                          disabled={loading}
                        >
                          <option value="No">No</option>
                          <option value="Yes">Yes</option>
                        </select>
                        <div className="absolute right-4 flex items-center pointer-events-none text-slate-400">
                          <ChevronDown size={16} />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Alcohol</label>
                      <div className="relative flex items-center">
                        <select
                          className="w-full pl-3 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#005A51] focus:ring-2 focus:ring-[#005A51]/10 transition-all font-bold text-slate-800 appearance-none cursor-pointer text-sm"
                          value={alcohol}
                          onChange={(e) => setAlcohol(e.target.value)}
                          disabled={loading}
                        >
                          <option value="No">No</option>
                          <option value="Yes">Yes</option>
                        </select>
                        <div className="absolute right-4 flex items-center pointer-events-none text-slate-400">
                          <ChevronDown size={16} />
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

                {/* 3. Medical History Group */}
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-4 shadow-sm">
                  <h3 className="text-sm font-bold text-[#005A51] uppercase tracking-wider border-b border-slate-200/60 pb-2 flex items-center gap-2 font-outfit">
                    <ShieldCheck size={16} /> Medical History
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.keys(medicalHistory).map((condition) => (
                      <div 
                        key={condition} 
                        className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all cursor-pointer select-none text-sm ${
                          medicalHistory[condition] 
                            ? 'bg-teal-50/50 border-[#005A51] text-[#005A51]' 
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                        onClick={() => {
                          if (loading) return;
                          const key = condition;
                          setMedicalHistory(prev => {
                            if (key === "None") {
                              return { Diabetes: false, Hypertension: false, HeartDisease: false, Asthma: false, None: true };
                            } else {
                              const next = { ...prev, [key]: !prev[key], None: false };
                              const anyChecked = Object.keys(next).some(k => k !== "None" && next[k]);
                              if (!anyChecked) next.None = true;
                              return next;
                            }
                          });
                        }}
                      >
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded text-[#005A51] focus:ring-[#005A51]/10 border-slate-300 cursor-pointer accent-[#005A51] pointer-events-none"
                          checked={medicalHistory[condition]}
                          readOnly
                        />
                        <span className="font-semibold text-xs">{condition === 'HeartDisease' ? 'Heart Disease' : condition}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 text-rose-600 bg-rose-50 p-4 rounded-xl border border-rose-100 animate-in fade-in duration-200">
                <ShieldCheck size={18} />
                <p className="text-sm font-bold">{error}</p>
              </div>
            )}

            {/* HIPAA Compliance note */}
            <div className="flex items-start gap-2 bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-xs text-slate-500 font-medium">
              <span className="text-[#005A51] mt-0.5 text-sm">🔒</span>
              <p className="leading-relaxed">
                <strong className="text-slate-700">HIPAA Protected connection:</strong> All clinical data is encrypted in transit and at rest using standard healthcare privacy protocols.
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#005A51] hover:bg-[#004D45] text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 mt-8 shadow-sm hover:shadow-md text-sm active:scale-[0.99] disabled:opacity-70 disabled:cursor-wait"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Provisioning...
                </>
              ) : (
                <>
                  Create Account <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Already have an account? */}
          <div className="mt-8 text-center text-sm font-semibold text-slate-500">
            Already have an account? <Link to="/login" className="text-[#005A51] hover:underline font-extrabold ml-1">Sign In</Link>
          </div>

          {/* Footer Trust Badges */}
          <div className="mt-8 pt-6 border-t border-slate-100 text-[11px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-4">
            <span className="flex items-center gap-1.5"><ShieldCheck size={14} /> SECURED ECOSYSTEM</span>
            <div className="w-1 h-1 bg-slate-300 rounded-full" />
            <span>V1.2.0</span>
          </div>

        </div>
      </div>
    </div>
  );
}