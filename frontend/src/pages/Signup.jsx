import { useState } from "react";
import supabase from "../services/supabase";
import { useNavigate, Link } from "react-router-dom";
import MedAILogo from "../components/MedAILogo";
import { 
  ArrowRight, Loader2, ShieldCheck, ChevronDown, Eye, EyeOff,
  CheckCircle2, Globe, Lock
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

    try {
      // 🩺 JAVASCRIPT VALIDATIONS FOR MAIN USER FIELDS
      if (!fullName || !fullName.trim()) {
        setError("Please enter your legal name.");
        setLoading(false);
        return;
      }
      if (!email || !email.trim() || !email.includes("@")) {
        setError("Please enter a valid email address.");
        setLoading(false);
        return;
      }
      if (!password || password.length < 6) {
        setError("Security key (password) must be at least 6 characters long.");
        setLoading(false);
        return;
      }

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
    } catch (err) {
      console.error("Signup exception caught:", err);
      setError(err.message || err.toString());
      setLoading(false);
    }
  };

  const checklistItems = [
    "Real-Time Health Monitoring",
    "AI-Powered Risk Assessment",
    "Physician Verification",
    "Secure Health Data"
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-plus text-slate-800 flex flex-col justify-between">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Outfit:wght@400;500;600;700;800&display=swap');
        .font-plus { font-family: 'Plus Jakarta Sans', sans-serif; }
        .font-outfit { font-family: 'Outfit', sans-serif; }
      `}</style>

      {/* ── PROVISIONING STATUS BADGE ── */}
      {loading && (
        <div 
          className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 bg-slate-900 text-emerald-300 px-6 py-2.5 rounded-full text-xs font-semibold shadow-2xl"
          role="status"
          aria-live="polite"
        >
          <Loader2 size={16} className="animate-spin text-emerald-400" />
          <span>Provisioning secure clinical profile...</span>
        </div>
      )}

      {/* ── MAIN SPLIT-SCREEN CONTAINER ── */}
      <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 w-full">

        {/* ── LEFT HERO SECTION (SOFT ICE-BLUE GRADIENT) ── */}
        <div className="lg:col-span-5 bg-gradient-to-br from-[#EEF5FF] via-[#EBF3FF] to-[#E6F4F1] p-8 lg:p-12 xl:p-16 flex flex-col justify-between relative overflow-hidden">
          
          {/* Top Logo */}
          <div className="z-10">
            <MedAILogo to="/" size="lg" />
          </div>

          {/* Main Headline & Checklist */}
          <div className="my-auto py-10 z-10 max-w-lg">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.12] font-outfit">
              Smarter health, <br />
              connected care.
            </h1>

            <p className="mt-4 text-slate-600 text-base font-medium leading-relaxed">
              Join the future of personalized healthcare. MedAI provides continuous intelligence for proactive wellness management.
            </p>

            {/* Checklist */}
            <div className="mt-8 space-y-3">
              {checklistItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full border-2 border-[#10B981] flex items-center justify-center text-[#10B981] shrink-0">
                    <CheckCircle2 size={13} strokeWidth={3} />
                  </div>
                  <span className="text-sm font-semibold text-slate-700">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 3D Decorative Graphic Accents on the right edge */}
          <div className="absolute right-[-40px] top-[40%] translate-y-[-50%] pointer-events-none opacity-90 hidden sm:block">
            <div className="relative w-64 h-64">
              <div className="absolute w-44 h-44 rounded-full bg-gradient-to-br from-[#10B981] to-[#06B6D4] opacity-80 blur-0 shadow-xl right-0 top-10" />
              <div className="absolute w-32 h-32 rounded-full border-[10px] border-[#0A2540] opacity-80 left-0 top-0" />
              <div className="absolute w-12 h-12 bg-[#38BDF8] rotate-45 rounded-lg bottom-4 right-16 opacity-70" />
            </div>
          </div>

          {/* Left Footer */}
          <div className="z-10 pt-6">
            <p className="text-xs font-medium text-slate-400">
              © 2024 MedAI Solutions. All rights reserved.
            </p>
          </div>
        </div>

        {/* ── RIGHT SIGNUP FORM CONTAINER ── */}
        <div className="lg:col-span-7 bg-[#F8FAFC] p-4 sm:p-8 lg:p-12 flex flex-col justify-center items-center">
          
          {/* Card Container */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-10 shadow-xl shadow-slate-200/50 max-w-xl w-full my-auto">
            
            {/* Card Header */}
            <header className="mb-6 pb-4 border-b border-slate-100 relative">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-outfit">
                    Create your account
                  </h2>
                  <p className="mt-1 text-slate-500 font-medium text-sm">
                    Create your secure MedAI patient profile.
                  </p>
                </div>
                
                {/* Language pill badge */}
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 border border-slate-200 px-2.5 py-1 rounded-full shrink-0">
                  <Globe size={13} /> EN
                </div>
              </div>
            </header>

            {/* Signup Form */}
            <form onSubmit={handleSignup} className="space-y-5">
              
              {/* SECTION 1: ACCOUNT DETAILS */}
              <div>
                <h3 className="text-[11px] font-extrabold tracking-wider text-slate-400 uppercase mb-3">
                  Account Details
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-3.5">
                  {/* Full Name */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-600">Full Name</label>
                    <input
                      type="text"
                      placeholder="Jane Doe"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/15 font-semibold text-slate-800 placeholder:text-slate-400 text-sm"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      disabled={loading}
                      required
                    />
                  </div>

                  {/* Email Address */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-600">Email Address</label>
                    <input
                      type="email"
                      placeholder="jane@example.com"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/15 font-semibold text-slate-800 placeholder:text-slate-400 text-sm"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Password */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-600">Password</label>
                    <div className="relative flex items-center">
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="w-full pl-3.5 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/15 font-semibold text-slate-800 placeholder:text-slate-400 text-sm"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 text-slate-400 hover:text-slate-600 focus:outline-none p-1"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>

                    {/* Password Strength Indicator */}
                    {password && (
                      <div className="mt-1 space-y-1">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-slate-500 font-semibold">Password Strength:</span>
                          <span className={`font-bold ${getPasswordStrength(password).text}`}>
                            {getPasswordStrength(password).label}
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${getPasswordStrength(password).color}`}
                            style={{ width: `${(getPasswordStrength(password).score / 4) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Profile Role */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-600">Role</label>
                    <div className="relative flex items-center">
                      <select
                        className="w-full pl-3.5 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/15 font-semibold text-slate-800 appearance-none cursor-pointer disabled:opacity-50 text-sm"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        disabled={loading}
                      >
                        <option value="patient">Patient</option>
                        <option value="doctor">Licensed Physician</option>
                      </select>
                      <div className="absolute right-3 flex items-center pointer-events-none text-slate-400">
                        <ChevronDown size={16} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 🩺 PATIENT PROFILE FIELDS */}
              {role === "patient" && (
                <div className="space-y-5 pt-2">
                  
                  {/* SECTION 2: VITALS & METRICS */}
                  <div>
                    <h3 className="text-[11px] font-extrabold tracking-wider text-slate-400 uppercase mb-3">
                      Vitals & Metrics
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Age */}
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-slate-600">Age</label>
                        <input
                          type="number"
                          placeholder="Years"
                          min="1"
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/15 font-semibold text-slate-800 placeholder:text-slate-400 text-sm"
                          value={age}
                          onChange={(e) => setAge(e.target.value)}
                          disabled={loading}
                        />
                      </div>

                      {/* Height */}
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-slate-600">Height</label>
                        <div className="relative flex items-center">
                          <input
                            type="number"
                            placeholder="0"
                            min="1"
                            className="w-full pl-3.5 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/15 font-semibold text-slate-800 placeholder:text-slate-400 text-sm"
                            value={height}
                            onChange={(e) => setHeight(e.target.value)}
                            disabled={loading}
                          />
                          <span className="absolute right-3 text-xs font-semibold text-slate-400 pointer-events-none">cm</span>
                        </div>
                      </div>

                      {/* Weight */}
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-slate-600">Weight</label>
                        <div className="relative flex items-center">
                          <input
                            type="number"
                            placeholder="0"
                            min="1"
                            step="0.1"
                            className="w-full pl-3.5 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/15 font-semibold text-slate-800 placeholder:text-slate-400 text-sm"
                            value={weight}
                            onChange={(e) => setWeight(e.target.value)}
                            disabled={loading}
                          />
                          <span className="absolute right-3 text-xs font-semibold text-slate-400 pointer-events-none">kg</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SECTION 3: LIFESTYLE FACTORS */}
                  <div>
                    <h3 className="text-[11px] font-extrabold tracking-wider text-slate-400 uppercase mb-3">
                      Lifestyle Factors
                    </h3>

                    <div className="flex flex-wrap items-center gap-6">
                      {/* Athlete Toggle */}
                      <label className="flex items-center gap-2.5 cursor-pointer select-none">
                        <div 
                          className={`w-11 h-6 rounded-full p-0.5 transition-colors ${athleteStatus ? 'bg-[#10B981]' : 'bg-slate-200'}`}
                          onClick={() => !loading && setAthleteStatus(!athleteStatus)}
                        >
                          <div className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${athleteStatus ? 'translate-x-5' : 'translate-x-0'}`} />
                        </div>
                        <span className="text-xs font-semibold text-slate-700">Athlete</span>
                      </label>

                      {/* Smoking Select / Toggle */}
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2.5 cursor-pointer select-none">
                          <div 
                            className={`w-11 h-6 rounded-full p-0.5 transition-colors ${smoking === "Yes" ? 'bg-[#10B981]' : 'bg-slate-200'}`}
                            onClick={() => !loading && setSmoking(smoking === "Yes" ? "No" : "Yes")}
                          >
                            <div className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${smoking === "Yes" ? 'translate-x-5' : 'translate-x-0'}`} />
                          </div>
                          <span className="text-xs font-semibold text-slate-700">Smoking</span>
                        </label>
                      </div>

                      {/* Alcohol Select / Toggle */}
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2.5 cursor-pointer select-none">
                          <div 
                            className={`w-11 h-6 rounded-full p-0.5 transition-colors ${alcohol === "Yes" ? 'bg-[#10B981]' : 'bg-slate-200'}`}
                            onClick={() => !loading && setAlcohol(alcohol === "Yes" ? "No" : "Yes")}
                          >
                            <div className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${alcohol === "Yes" ? 'translate-x-5' : 'translate-x-0'}`} />
                          </div>
                          <span className="text-xs font-semibold text-slate-700">Alcohol</span>
                        </label>
                      </div>
                    </div>

                    {/* Conditional Athlete Fields */}
                    {athleteStatus && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 border border-slate-200/70 rounded-2xl p-3.5 mt-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-600">Sport Type</label>
                          <select
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-[#10B981]"
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
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-600">Training Freq.</label>
                          <select
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-[#10B981]"
                            value={trainingFrequency}
                            onChange={(e) => setTrainingFrequency(e.target.value)}
                            disabled={loading}
                          >
                            <option value="Daily">Daily</option>
                            <option value="3–5 Days/Week">3–5 Days/Week</option>
                            <option value="Occasionally">Occasionally</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-600">Resting HR (BPM)</label>
                          <input
                            type="number"
                            placeholder="60"
                            min="1"
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-[#10B981]"
                            value={restingHeartRate}
                            onChange={(e) => setRestingHeartRate(e.target.value)}
                            disabled={loading}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* SECTION 4: PRE-EXISTING CONDITIONS */}
                  <div>
                    <h3 className="text-[11px] font-extrabold tracking-wider text-slate-400 uppercase mb-3">
                      Pre-Existing Conditions
                    </h3>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {Object.keys(medicalHistory).map((condition) => {
                        const isChecked = medicalHistory[condition];
                        return (
                          <label 
                            key={condition} 
                            className="flex items-center gap-2.5 cursor-pointer select-none text-xs font-semibold text-slate-700"
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
                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                              isChecked ? 'bg-[#10B981] border-[#10B981] text-white' : 'border-slate-300 bg-white'
                            }`}>
                              {isChecked && <CheckCircle2 size={12} strokeWidth={3} />}
                            </div>
                            <span>{condition === 'HeartDisease' ? 'Heart Disease' : condition}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                </div>
              )}

              {/* Error Banner */}
              {error && (
                <div className="flex items-start gap-2.5 text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-200 text-xs font-bold" role="alert">
                  <ShieldCheck size={16} className="shrink-0 mt-0.5 text-rose-600" />
                  <p>{error}</p>
                </div>
              )}

              {/* SECTION 5: HIPAA NOTICE */}
              <div className="flex items-start gap-2.5 bg-slate-50/90 border border-slate-100 p-3 rounded-xl text-[11px] text-slate-500 font-medium leading-relaxed">
                <Lock size={13} className="shrink-0 mt-0.5 text-slate-400" />
                <p>
                  Your health data is encrypted and protected under HIPAA compliance. We do not share your personal information without explicit consent.
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#10B981] hover:bg-[#059669] text-white font-bold py-3.5 px-5 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm shadow-sm active:scale-[0.99] disabled:opacity-75 disabled:cursor-wait"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> Provisioning Account...
                  </>
                ) : (
                  <>
                    Create Account <ArrowRight size={16} />
                  </>
                )}
              </button>

            </form>

            {/* Log in Footer link */}
            <div className="mt-6 text-center text-xs font-medium text-slate-500">
              Already have an account?{" "}
              <Link to="/login" className="text-[#10B981] hover:underline font-bold ml-0.5">
                Log in
              </Link>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}