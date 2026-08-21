import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../services/supabase";
import {
  Activity, ArrowLeft, Apple, ShieldCheck, Heart, User, Check, Info,
  TrendingUp, Award, Compass, AlertTriangle, AlertCircle, Droplet,
  ChevronRight, RefreshCw, FileText, DollarSign, Ban, BookOpen, Utensils,
  Target, Salad, Pill, LayoutDashboard, LogOut, CheckCircle2, Play
} from "lucide-react";

// CDSS Service Imports
import { UserProfile, SmartwatchVitals, UserInputs, DietPlanOutput } from "../services/nutrition/NutritionTypes";
import { generateNutritionRecommendations } from "../services/nutrition/NutritionRecommendationService";
import { fetchNutritionExplanation, GeminiExplanation } from "../services/nutrition/NutritionExplanationService";
import { formatEvidenceLevel } from "../services/nutrition/NutritionUtils";

export default function DietPlanner() {
  const navigate = useNavigate();
  
  // Patient Dossier State (Fetched)
  const [healthProfile, setHealthProfile] = useState<UserProfile | null>(null);
  const [vitals, setVitals] = useState<SmartwatchVitals>({
    heart_rate: "72",
    spo2: "98",
    systolic_bp: "120",
    diastolic_bp: "80",
    steps: "5000",
    risk_level: "LOW"
  });
  const [loadingDossier, setLoadingDossier] = useState(true);

  // User Questionnaire Inputs
  const [userInputs, setUserInputs] = useState<UserInputs>({
    preference: "Vegetarian",
    allergies: "",
    goal: "Maintain Weight",
    budget: "Medium"
  });

  // Output States
  const [generatedPlan, setGeneratedPlan] = useState<DietPlanOutput | null>(null);
  const [geminiExplanation, setGeminiExplanation] = useState<GeminiExplanation | null>(null);
  
  // Loading & Error States
  const [generating, setGenerating] = useState(false);
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [geminiOffline, setGeminiOffline] = useState(false);

  // Fetch Patient Dossier on mount
  useEffect(() => {
    fetchPatientDossier();
  }, []);

  const fetchPatientDossier = async () => {
    setLoadingDossier(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }
      
      // Load patient profile
      const { data: patientProfile } = await supabase
        .from('patient_profile')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (patientProfile) {
        setHealthProfile(patientProfile);
      } else {
        console.warn("No patient profile found in database");
      }

      // Load latest vitals and risk from medical_reports
      const { data: reports } = await supabase
        .from('medical_reports')
        .select('*')
        .eq('patient_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (reports && reports.length > 0) {
        const latestReport = reports[0];
        setVitals({
          heart_rate: String(latestReport.vitals?.heart_rate || "72"),
          spo2: String(latestReport.vitals?.spo2 || "98"),
          systolic_bp: String(latestReport.vitals?.systolic_bp || "120"),
          diastolic_bp: String(latestReport.vitals?.diastolic_bp || "80"),
          steps: String(latestReport.vitals?.steps || "5000"),
          risk_level: latestReport.risk_level || "LOW"
        });
      }
    } catch (err: any) {
      console.error("Error loading patient dossier:", err.message);
    } finally {
      setLoadingDossier(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setGeminiLoading(true);
    setGeminiOffline(false);
    setGeminiExplanation(null);

    // 1. Run local deterministic Clinical Decision Support Engine
    const localPlan = generateNutritionRecommendations(healthProfile, vitals, userInputs);
    setGeneratedPlan(localPlan);
    setGenerating(false);

    // 2. Query Gemini for explanation (Optional/Proxy)
    try {
      const explanationData = await fetchNutritionExplanation(localPlan, healthProfile, vitals, userInputs);
      setGeminiExplanation(explanationData);
    } catch (err) {
      console.warn("Gemini explanation proxy returned an error. Falling back to local CDSS only.", err);
      setGeminiOffline(true);
    } finally {
      setGeminiLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  // Maps goals to readable display values
  const getPersonalizedGoalTitle = () => {
    if (!generatedPlan) return "";
    const history = healthProfile?.medical_history || [];
    const systolic = parseFloat(vitals.systolic_bp);
    const diastolic = parseFloat(vitals.diastolic_bp);
    const isHypertension = history.includes("Hypertension") || systolic > 120 || diastolic > 80;

    if (isHypertension) return "Blood Pressure Management & DASH Guidelines";
    if (userInputs.goal === "Weight Loss") return "Weight Loss (Caloric Deficit)";
    if (userInputs.goal === "Weight Gain") return "Weight Gain (Caloric Surplus)";
    if (userInputs.goal === "Muscle Gain") return "Muscle Gain (Protein Hypertrophy)";
    return "General Healthy Diet Guidelines";
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-[#FFFFFF] via-[#F6FCFA] to-[#E8F6F3] font-sans text-[#173B3A] selection:bg-[#007F73]/10">
      
      {/* SIDEBAR */}
      <aside className="hidden lg:flex flex-col w-72 bg-[#EAF5F2]/90 backdrop-blur-sm border-r border-[#DCE9E6] p-6 fixed h-full z-30 justify-between">
        <div className="space-y-6">
          <div className="flex items-center gap-3 pt-1">
            <div className="bg-[#007F73] p-2.5 rounded-2xl shadow-md text-white">
              <Activity size={22} strokeWidth={2.5} />
            </div>
            <div>
              <span className="font-extrabold text-xl text-[#173B3A] tracking-tight block leading-none">MedAI</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#657977] mt-1 block">Clinical Support</span>
            </div>
          </div>

          <nav className="space-y-1.5 pt-2">
            <button 
              onClick={() => navigate("/patient")} 
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm text-[#5A716E] hover:text-[#007F73] hover:bg-[#DDF3EF] transition-all"
            >
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </button>
            <button 
              onClick={() => navigate("/patient")} 
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm text-[#5A716E] hover:text-[#007F73] hover:bg-[#DDF3EF] transition-all"
            >
              <FileText size={18} />
              <span>Records</span>
            </button>
            <button 
              onClick={() => navigate("/patient")} 
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm text-[#5A716E] hover:text-[#007F73] hover:bg-[#DDF3EF] transition-all"
            >
              <Pill size={18} />
              <span>Pharmacy & Meds</span>
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm bg-[#007F73] text-white shadow-sm shadow-[#007F73]/20">
              <Salad size={18} />
              <span>AI Diet Planner</span>
            </button>
          </nav>
        </div>

        <button 
          onClick={handleLogout} 
          className="flex items-center gap-3 px-4 py-3 text-[#657977] font-bold text-sm hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
        >
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
      </aside>

      {/* MAIN CONTAINER */}
      <main className="flex-1 lg:ml-72 p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6">
        
        {/* COMPACT HEADER */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#DCE9E6] pb-4">
          <div className="space-y-1">
            <button 
              onClick={() => navigate("/patient")} 
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#657977] hover:text-[#007F73] transition-colors mb-1"
            >
              <ArrowLeft size={14} /> Back to Dashboard
            </button>
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#173B3A] tracking-tight">Clinical Nutrition CDSS</h1>
          </div>
          <div className="self-start sm:self-center">
            <span className="bg-[#EAF7F4] text-[#007F73] border border-[#BCE6DC] px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide">
              Evidence-Based Clinical Nutrition Decision Support System
            </span>
          </div>
        </header>

        {/* TOP DASHBOARD GRID: PATIENT DOSSIER & NUTRITION GOAL */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* CLINICAL PATIENT DOSSIER CARD (8 cols) */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-[#DCE9E6] shadow-sm p-5 md:p-6 flex flex-col justify-between space-y-4">
            <div className="flex justify-between items-center border-b border-[#EEF5F3] pb-3">
              <h3 className="text-base font-bold text-[#173B3A] flex items-center gap-2">
                <ShieldCheck className="text-[#007F73]" size={18} /> Clinical Patient Dossier
              </h3>
              {healthProfile && (
                <span className="text-[11px] font-mono font-bold text-[#657977] bg-[#F0F9F7] px-2.5 py-1 rounded-lg border border-[#DCE9E6]">
                  ID: P-{healthProfile.id?.slice(0, 5).toUpperCase() || "98214"}
                </span>
              )}
            </div>

            {loadingDossier ? (
              <div className="flex justify-center items-center py-8 text-[#657977] text-xs gap-2">
                <RefreshCw className="animate-spin text-[#007F73]" size={16} /> Syncing smartwatch logs & health profile...
              </div>
            ) : (
              <div className="space-y-3">
                {/* Metric Strip 1 */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-[#F7FCFA] border border-[#E8F4F1] p-3 rounded-xl">
                    <span className="text-[10px] font-bold text-[#657977] uppercase tracking-wider block mb-0.5">Height</span>
                    <span className="text-sm font-extrabold text-[#173B3A]">{healthProfile?.height || 170} cm</span>
                  </div>
                  <div className="bg-[#F7FCFA] border border-[#E8F4F1] p-3 rounded-xl">
                    <span className="text-[10px] font-bold text-[#657977] uppercase tracking-wider block mb-0.5">Weight</span>
                    <span className="text-sm font-extrabold text-[#173B3A]">{healthProfile?.weight || 70} kg</span>
                  </div>
                  <div className="bg-[#F7FCFA] border border-[#E8F4F1] p-3 rounded-xl">
                    <span className="text-[10px] font-bold text-[#657977] uppercase tracking-wider block mb-0.5">BMI</span>
                    <span className="text-sm font-extrabold text-[#173B3A]">
                      {healthProfile?.bmi || parseFloat(((healthProfile?.weight || 70) / (((healthProfile?.height || 170) / 100) * ((healthProfile?.height || 170) / 100))).toFixed(1))}
                      <span className="inline-block w-2 h-2 rounded-full bg-[#16A085] ml-1.5" title="Normal Range"></span>
                    </span>
                  </div>
                  <div className="bg-[#F7FCFA] border border-[#E8F4F1] p-3 rounded-xl">
                    <span className="text-[10px] font-bold text-[#657977] uppercase tracking-wider block mb-0.5">Blood Pressure</span>
                    <span className="text-sm font-extrabold text-[#173B3A]">{vitals.systolic_bp}/{vitals.diastolic_bp} mmHg</span>
                  </div>
                </div>

                {/* Metric Strip 2 */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="bg-[#F7FCFA] border border-[#E8F4F1] p-3 rounded-xl flex justify-between items-center">
                    <div>
                      <span className="text-[10px] font-bold text-[#657977] uppercase tracking-wider block">Daily Steps</span>
                      <span className="text-sm font-extrabold text-[#173B3A]">{parseInt(vitals.steps).toLocaleString()} steps</span>
                    </div>
                  </div>

                  <div className="bg-[#F7FCFA] border border-[#E8F4F1] p-3 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-[#657977] uppercase tracking-wider block">Conditions</span>
                    <div className="flex flex-wrap gap-1">
                      {healthProfile?.medical_history && healthProfile.medical_history.length > 0 && !healthProfile.medical_history.includes("None") ? (
                        healthProfile.medical_history.map((cond, idx) => (
                          <span key={idx} className="bg-rose-50 border border-rose-100 text-rose-600 text-[10px] font-bold px-2 py-0.5 rounded-md">
                            {cond}
                          </span>
                        ))
                      ) : (
                        <span className="bg-[#EAF8F5] border border-[#C5EBE3] text-[#007F73] text-[10px] font-bold px-2 py-0.5 rounded-md">
                          None Active
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="bg-[#F7FCFA] border border-[#E8F4F1] p-3 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-[#657977] uppercase tracking-wider block">Profile</span>
                    <span className="text-xs font-bold text-[#173B3A] block">
                      {healthProfile?.athlete_status ? (
                        <span className="bg-[#EAF7F4] text-[#007F73] border border-[#BCE6DC] px-2 py-0.5 rounded-md text-[11px]">
                          Athlete ({healthProfile.sport_type})
                        </span>
                      ) : (
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-[11px]">
                          Standard Metabolism
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* NUTRITION GOAL CARD (4 cols) */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-[#DCE9E6] shadow-sm p-5 md:p-6 flex flex-col justify-between space-y-4">
            <div className="flex justify-between items-center border-b border-[#EEF5F3] pb-3">
              <h3 className="text-base font-bold text-[#173B3A] flex items-center gap-2">
                <Target className="text-[#007F73]" size={18} /> Nutrition Goal
              </h3>
            </div>

            <div className="space-y-2 my-auto">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#657977] block">Calculated Target</span>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-[#173B3A] tracking-tight">
                  {generatedPlan ? generatedPlan.calories : (healthProfile ? Math.round(2000) : 2000)}
                </span>
                <span className="text-sm font-semibold text-[#657977]">kcal/day</span>
              </div>

              <div className="pt-2">
                <span className="bg-[#EAF7F4] text-[#00665D] border border-[#C5EBE3] text-xs font-bold px-3 py-1.5 rounded-xl inline-flex items-center gap-1.5">
                  <TrendingUp size={14} className="text-[#007F73]" />
                  {generatedPlan ? getPersonalizedGoalTitle() : userInputs.goal}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* SECOND ROW: CDSS PARAMETERS FORM & CLINICAL POLICY / CONSENSUS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* CDSS PARAMETERS FORM (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-[#DCE9E6] shadow-sm p-5 md:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#EEF5F3] pb-3">
              <h3 className="text-base font-bold text-[#173B3A] flex items-center gap-2">
                <Utensils className="text-[#007F73]" size={18} /> CDSS Parameters
              </h3>
            </div>

            <form onSubmit={handleGenerate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-[#657977] mb-1 block tracking-wider">Food Preference</label>
                  <select
                    value={userInputs.preference}
                    onChange={(e) => setUserInputs({ ...userInputs, preference: e.target.value })}
                    className="w-full bg-[#F7FCFA] border border-[#DCE9E6] focus:border-[#007F73] focus:ring-1 focus:ring-[#007F73] p-2.5 rounded-xl text-xs font-semibold text-[#173B3A] outline-none transition-all"
                  >
                    <option value="Vegetarian">Vegetarian (Includes dairy)</option>
                    <option value="Non Vegetarian">Non-Vegetarian (Poultry, Fish, Eggs)</option>
                    <option value="Vegan">Vegan (Plant-based only)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-[#657977] mb-1 block tracking-wider">Dietary Goal</label>
                  <select
                    value={userInputs.goal}
                    onChange={(e) => setUserInputs({ ...userInputs, goal: e.target.value })}
                    className="w-full bg-[#F7FCFA] border border-[#DCE9E6] focus:border-[#007F73] focus:ring-1 focus:ring-[#007F73] p-2.5 rounded-xl text-xs font-semibold text-[#173B3A] outline-none transition-all"
                  >
                    <option value="Weight Loss">Weight Loss (Caloric Deficit)</option>
                    <option value="Weight Gain">Weight Gain (Caloric Surplus)</option>
                    <option value="Maintain Weight">Maintain Healthy Weight</option>
                    <option value="Muscle Gain">Muscle Gain (Hypertrophy)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-[#657977] mb-1 block tracking-wider">Budget Constraint</label>
                  <select
                    value={userInputs.budget}
                    onChange={(e) => setUserInputs({ ...userInputs, budget: e.target.value })}
                    className="w-full bg-[#F7FCFA] border border-[#DCE9E6] focus:border-[#007F73] focus:ring-1 focus:ring-[#007F73] p-2.5 rounded-xl text-xs font-semibold text-[#173B3A] outline-none transition-all"
                  >
                    <option value="Low">Low Budget (Affordable local options)</option>
                    <option value="Medium">Medium Budget (Standard balance)</option>
                    <option value="High">Premium Budget (Organic superfoods)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-[#657977] mb-1 block tracking-wider">Food Allergies</label>
                  <input
                    type="text"
                    value={userInputs.allergies}
                    onChange={(e) => setUserInputs({ ...userInputs, allergies: e.target.value })}
                    placeholder="e.g. Gluten, Nuts, Dairy (None reported)"
                    className="w-full bg-[#F7FCFA] border border-[#DCE9E6] focus:border-[#007F73] focus:ring-1 focus:ring-[#007F73] p-2.5 rounded-xl text-xs font-semibold text-[#173B3A] placeholder:text-[#94A5A3] outline-none transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={generating || loadingDossier}
                className="w-full bg-[#007F73] hover:bg-[#00665D] text-white font-bold py-3 px-6 rounded-xl shadow-sm transition-all flex justify-center items-center gap-2 text-sm disabled:opacity-50 mt-2"
              >
                {generating ? (
                  <>
                    <RefreshCw className="animate-spin" size={16} /> Evaluating CDSS Rules...
                  </>
                ) : (
                  <>
                    <Play size={15} fill="currentColor" /> Execute Nutrition CDSS
                  </>
                )}
              </button>
            </form>
          </div>

          {/* CLINICAL POLICY & CONSENSUS (5 cols) */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-[#DCE9E6] shadow-sm p-5 md:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#EEF5F3] pb-3">
              <h3 className="text-base font-bold text-[#173B3A] flex items-center gap-2">
                <CheckCircle2 className="text-[#007F73]" size={18} /> Clinical Policy & Consensus
              </h3>
            </div>

            {generatedPlan ? (
              <div className="space-y-3">
                {/* Consensus matched */}
                {generatedPlan.consensus_matched.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-[#16A085] uppercase tracking-wider block">Consensus Guidelines Aligned</span>
                    <div className="space-y-1.5">
                      {generatedPlan.consensus_matched.map((c, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-[#F7FCFA] border border-[#E8F4F1] p-2.5 rounded-xl text-xs">
                          <span className="font-semibold text-[#173B3A]">{c.topic}</span>
                          <span className="bg-[#EAF8F5] text-[#007F73] font-bold text-[10px] px-2 py-0.5 rounded-md border border-[#C5EBE3]">
                            APPLIED
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Conflicts detected */}
                {generatedPlan.conflicts_detected.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-[#EEF5F3]">
                    <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">Clinical Policy Conflicts Resolving</span>
                    <div className="space-y-1.5">
                      {generatedPlan.conflicts_detected.map((conflict, idx) => (
                        <div key={idx} className="bg-rose-50/70 border border-rose-100 p-2.5 rounded-xl space-y-1 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-rose-700">{conflict.topic}</span>
                            <span className="bg-rose-100 text-rose-700 font-bold text-[9px] px-2 py-0.5 rounded-md">
                              POLICY APPLIED
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 italic">{conflict.resolution}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="flex justify-between items-center bg-[#F7FCFA] border border-[#E8F4F1] p-2.5 rounded-xl text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#16A085]"></span>
                    <span className="font-semibold text-[#173B3A]">WHO Global Diet Guidelines (2023)</span>
                  </div>
                  <span className="bg-[#EAF8F5] text-[#007F73] font-bold text-[10px] px-2 py-0.5 rounded-md border border-[#C5EBE3]">APPLIED</span>
                </div>

                <div className="flex justify-between items-center bg-[#F7FCFA] border border-[#E8F4F1] p-2.5 rounded-xl text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#16A085]"></span>
                    <span className="font-semibold text-[#173B3A]">AHA Cardiovascular Nutrition</span>
                  </div>
                  <span className="bg-[#EAF8F5] text-[#007F73] font-bold text-[10px] px-2 py-0.5 rounded-md border border-[#C5EBE3]">APPLIED</span>
                </div>

                <div className="flex justify-between items-center bg-[#F7FCFA] border border-[#E8F4F1] p-2.5 rounded-xl text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                    <span className="font-semibold text-slate-500">ADA Diabetes Prevention</span>
                  </div>
                  <span className="bg-slate-100 text-slate-500 font-bold text-[10px] px-2 py-0.5 rounded-md">SKIPPED (N/A)</span>
                </div>

                <div className="flex justify-between items-center bg-[#F7FCFA] border border-[#E8F4F1] p-2.5 rounded-xl text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#16A085]"></span>
                    <span className="font-semibold text-[#173B3A]">ACSM & ISSN Sports Nutrition</span>
                  </div>
                  <span className="bg-[#EAF8F5] text-[#007F73] font-bold text-[10px] px-2 py-0.5 rounded-md border border-[#C5EBE3]">APPLIED</span>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* OUTPUT SECTIONS WHEN PLAN IS GENERATED */}
        {generatedPlan && (
          <div className="space-y-6">
            
            {/* PERSONALIZED NUTRITION SUMMARY BANNER */}
            <div className="bg-[#EAF7F4] border border-[#BCE6DC] p-5 rounded-2xl space-y-1">
              <span className="text-[10px] font-bold text-[#007F73] uppercase tracking-wider block">Personalized Clinical Summary</span>
              <h4 className="text-lg font-extrabold text-[#173B3A]">{getPersonalizedGoalTitle()}</h4>
              <p className="text-xs text-[#657977] font-medium">
                Evaluated dynamically against medical profile data and active smartwatch vitals triage thresholds.
              </p>
            </div>

            {/* SECTION 2: CLINICAL RECOMMENDATIONS */}
            <div className="bg-white rounded-2xl border border-[#DCE9E6] shadow-sm p-5 md:p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#EEF5F3] pb-3">
                <h3 className="text-base font-bold text-[#173B3A] flex items-center gap-2">
                  <Award className="text-[#007F73]" size={18} /> Clinical Recommendations
                </h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {generatedPlan.rules_matched.map((rule, idx) => (
                  <div key={idx} className="p-3.5 bg-[#F7FCFA] border border-[#E8F4F1] rounded-xl flex flex-col justify-between space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="bg-[#E8F6F3] text-[#007F73] font-extrabold text-[10px] px-2.5 py-0.5 rounded-md border border-[#C5EBE3]">
                        {rule.organization}
                      </span>
                      <span className={`font-bold uppercase tracking-wider text-[9px] ${
                        rule.evidence_strength === "HIGH" ? "text-[#16A085]" :
                        rule.evidence_strength === "MODERATE" ? "text-amber-600" : "text-slate-500"
                      }`}>
                        Evidence: {formatEvidenceLevel(rule.evidence_strength)}
                      </span>
                    </div>
                    
                    <p className="text-xs font-bold text-[#173B3A] leading-snug">{rule.recommendation}</p>
                    
                    <div className="flex items-center gap-2 text-[10px] text-[#657977] pt-1">
                      <span>Topic: <strong>{rule.clinical_topic}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION 3: DAILY MEAL PLAN */}
            <div className="bg-white rounded-2xl border border-[#DCE9E6] shadow-sm p-5 md:p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#EEF5F3] pb-3">
                <h3 className="text-base font-bold text-[#173B3A] flex items-center gap-2">
                  <Salad className="text-[#007F73]" size={18} /> Daily Meal Plan
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                <div className="bg-[#F7FCFA] border border-[#E1EFEA] p-4 rounded-xl space-y-1.5">
                  <span className="text-[10px] font-bold text-[#007F73] uppercase tracking-wider bg-[#EAF7F4] px-2 py-0.5 rounded-md inline-block">
                    Breakfast
                  </span>
                  <p className="text-xs font-semibold text-[#173B3A] leading-relaxed">{generatedPlan.meals.breakfast}</p>
                </div>

                <div className="bg-[#F7FCFA] border border-[#E1EFEA] p-4 rounded-xl space-y-1.5">
                  <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider bg-teal-50 px-2 py-0.5 rounded-md inline-block">
                    Snacks (AM)
                  </span>
                  <p className="text-xs font-semibold text-[#173B3A] leading-relaxed">{generatedPlan.meals.morning_snack}</p>
                </div>

                <div className="bg-[#F7FCFA] border border-[#E1EFEA] p-4 rounded-xl space-y-1.5">
                  <span className="text-[10px] font-bold text-[#007F73] uppercase tracking-wider bg-[#EAF7F4] px-2 py-0.5 rounded-md inline-block">
                    Lunch
                  </span>
                  <p className="text-xs font-semibold text-[#173B3A] leading-relaxed">{generatedPlan.meals.lunch}</p>
                </div>

                <div className="bg-[#F7FCFA] border border-[#E1EFEA] p-4 rounded-xl space-y-1.5">
                  <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider bg-teal-50 px-2 py-0.5 rounded-md inline-block">
                    Snacks (PM)
                  </span>
                  <p className="text-xs font-semibold text-[#173B3A] leading-relaxed">{generatedPlan.meals.evening_snack}</p>
                </div>

                <div className="bg-[#F7FCFA] border border-[#E1EFEA] p-4 rounded-xl space-y-1.5">
                  <span className="text-[10px] font-bold text-[#007F73] uppercase tracking-wider bg-[#EAF7F4] px-2 py-0.5 rounded-md inline-block">
                    Dinner
                  </span>
                  <p className="text-xs font-semibold text-[#173B3A] leading-relaxed">{generatedPlan.meals.dinner}</p>
                </div>

                <div className="bg-[#EBF8F5] border border-[#BCE6DC] p-4 rounded-xl space-y-1.5">
                  <span className="text-[10px] font-bold text-[#007F73] uppercase tracking-wider bg-white px-2 py-0.5 rounded-md inline-block border border-[#BCE6DC]">
                    Hydration Target
                  </span>
                  <p className="text-xs font-semibold text-[#173B3A] leading-relaxed">
                    Consume at least <strong>{generatedPlan.water} Liters</strong> of clean water daily to maintain cellular hydration (ACSM Guideline).
                  </p>
                </div>
              </div>
            </div>

            {/* SECTIONS 4 & 5: FOODS TO PREFER / LIMIT */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* FOODS TO PREFER */}
              <div className="bg-white rounded-2xl border border-[#DCE9E6] shadow-sm p-5 space-y-3">
                <h3 className="text-base font-bold text-[#173B3A] flex items-center gap-2 border-b border-[#EEF5F3] pb-3">
                  <Check className="text-[#16A085]" size={18} /> Foods to Prefer
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {generatedPlan.foods_to_prefer.map((food, idx) => (
                    <span key={idx} className="bg-[#E8F8F5] text-[#007F73] border border-[#C5EBE3] text-xs font-bold px-3 py-1.5 rounded-xl">
                      {food}
                    </span>
                  ))}
                </div>
              </div>

              {/* FOODS TO LIMIT / AVOID */}
              <div className="bg-white rounded-2xl border border-[#DCE9E6] shadow-sm p-5 space-y-3">
                <h3 className="text-base font-bold text-[#173B3A] flex items-center gap-2 border-b border-[#EEF5F3] pb-3">
                  <Ban className="text-rose-500" size={18} /> Foods to Limit / Avoid
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {generatedPlan.foods_to_limit.map((food, idx) => (
                    <span key={idx} className="bg-rose-50 text-rose-700 border border-rose-100 text-xs font-bold px-3 py-1.5 rounded-xl">
                      {food}
                    </span>
                  ))}
                </div>
              </div>

            </div>

            {/* SECTION 6: PERSONALIZED NUTRITION TARGETS */}
            <div className="bg-white rounded-2xl border border-[#DCE9E6] shadow-sm p-5 md:p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#EEF5F3] pb-3">
                <h3 className="text-base font-bold text-[#173B3A] flex items-center gap-2">
                  <TrendingUp className="text-[#007F73]" size={18} /> Personalized Nutrition Targets
                </h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-[#007F73] text-white p-4 rounded-xl flex flex-col justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-90">Energy Intake</span>
                  <div className="pt-2">
                    <span className="text-2xl font-extrabold">{generatedPlan.calories}</span>
                    <span className="text-xs opacity-80 block">kcal</span>
                  </div>
                </div>

                <div className="bg-[#F7FCFA] border border-[#E8F4F1] p-4 rounded-xl flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-[#657977] uppercase tracking-wider">Protein Target</span>
                  <div className="pt-2">
                    <span className="text-2xl font-extrabold text-[#173B3A]">{generatedPlan.protein}</span>
                    <span className="text-xs text-[#657977] block">g</span>
                  </div>
                </div>

                <div className="bg-[#F7FCFA] border border-[#E8F4F1] p-4 rounded-xl flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-[#657977] uppercase tracking-wider">Carbohydrates</span>
                  <div className="pt-2">
                    <span className="text-2xl font-extrabold text-[#173B3A]">{generatedPlan.carbohydrates}</span>
                    <span className="text-xs text-[#657977] block">g</span>
                  </div>
                </div>

                <div className="bg-[#F7FCFA] border border-[#E8F4F1] p-4 rounded-xl flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-[#657977] uppercase tracking-wider">Dietary Fats</span>
                  <div className="pt-2">
                    <span className="text-2xl font-extrabold text-[#173B3A]">{generatedPlan.fat}</span>
                    <span className="text-xs text-[#657977] block">g</span>
                  </div>
                </div>

                <div className="bg-[#F7FCFA] border border-[#E8F4F1] p-4 rounded-xl flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-[#657977] uppercase tracking-wider">Dietary Fiber</span>
                  <div className="pt-2">
                    <span className="text-2xl font-extrabold text-[#173B3A]">{generatedPlan.fiber}</span>
                    <span className="text-xs text-[#657977] block">g</span>
                  </div>
                </div>

                <div className="bg-[#F7FCFA] border border-[#E8F4F1] p-4 rounded-xl flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-[#657977] uppercase tracking-wider">Water Intake</span>
                  <div className="pt-2">
                    <span className="text-2xl font-extrabold text-[#173B3A]">{generatedPlan.water}</span>
                    <span className="text-xs text-[#657977] block">Liters</span>
                  </div>
                </div>

                <div className="bg-[#F7FCFA] border border-[#E8F4F1] p-4 rounded-xl flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-[#657977] uppercase tracking-wider">Sodium Limit</span>
                  <div className="pt-2">
                    <span className="text-2xl font-extrabold text-[#173B3A]">{generatedPlan.sodium}</span>
                    <span className="text-xs text-[#657977] block">mg</span>
                  </div>
                </div>

                <div className="bg-[#F7FCFA] border border-[#E8F4F1] p-4 rounded-xl flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-[#657977] uppercase tracking-wider">Sugar Ceiling</span>
                  <div className="pt-2">
                    <span className="text-2xl font-extrabold text-[#173B3A]">{generatedPlan.sugar}</span>
                    <span className="text-xs text-[#657977] block">g</span>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 7: RULE TRANSPARENCY TRAIL */}
            <div className="bg-white rounded-2xl border border-[#DCE9E6] shadow-sm p-5 md:p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#EEF5F3] pb-3">
                <h3 className="text-base font-bold text-[#173B3A] flex items-center gap-2">
                  <BookOpen className="text-[#007F73]" size={18} /> Rule Transparency Trail
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#DCE9E6] text-[#657977] font-bold">
                      <th className="py-2.5 px-2">Clinical Rule ID</th>
                      <th className="py-2.5 px-2">Organization</th>
                      <th className="py-2.5 px-2">Guideline & Topic</th>
                      <th className="py-2.5 px-2">Evidence Level</th>
                      <th className="py-2.5 px-2">Publication & URL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {generatedPlan.rules_matched.map((rule, idx) => (
                      <tr key={idx} className="border-b border-[#F0F9F7] hover:bg-[#F7FCFA] transition-colors">
                        <td className="py-3 px-2 font-mono font-bold text-[#007F73]">{rule.rule_id}</td>
                        <td className="py-3 px-2">
                          <span className="bg-[#EAF7F4] text-[#007F73] font-bold px-2 py-0.5 rounded-md border border-[#BCE6DC] text-[10px]">
                            {rule.organization}
                          </span>
                        </td>
                        <td className="py-3 px-2 font-semibold text-[#173B3A]">
                          {rule.guideline_name}
                          <span className="block text-[10px] text-[#657977] font-normal mt-0.5">
                            Topic: {rule.clinical_topic}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          <span className={`font-bold uppercase tracking-wider text-[10px] ${
                            rule.evidence_strength === "HIGH" ? "text-[#16A085]" :
                            rule.evidence_strength === "MODERATE" ? "text-amber-600" : "text-slate-500"
                          }`}>
                            {rule.evidence_strength}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-[11px] text-[#657977]">
                          {rule.publication_year} | 
                          <a href={rule.url} target="_blank" rel="noopener noreferrer" className="text-[#007F73] hover:underline inline-flex items-center gap-0.5 ml-1 font-bold">
                            Source <ChevronRight size={10} />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECTION 8: AI EXPLANATION */}
            {(!geminiOffline || geminiLoading) && (
              <div className="bg-[#132A29] text-white rounded-2xl p-6 shadow-md space-y-4">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <span className="text-[10px] bg-[#1A3837] text-emerald-400 font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-[#234A49]">
                    AI Clinical Justification
                  </span>
                </div>

                {geminiLoading ? (
                  <div className="py-6 flex flex-col justify-center items-center gap-2 text-slate-300 text-xs">
                    <RefreshCw className="animate-spin text-emerald-400" size={20} />
                    <span>Gemini is generating natural language justifications...</span>
                  </div>
                ) : (
                  geminiExplanation && (
                    <div className="space-y-4">
                      <p className="text-xs leading-relaxed text-slate-200 font-medium italic">
                        "{geminiExplanation.explanation}"
                      </p>
                      
                      <div className="space-y-2 pt-2">
                        <span className="text-[10px] font-bold uppercase text-emerald-400 tracking-wider block">Personalized Clinical Insights:</span>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {geminiExplanation.personalized_tips.map((tip, idx) => (
                            <div key={idx} className="bg-[#1D3D3C] p-3 rounded-xl border border-[#275250] text-xs text-slate-200 leading-relaxed">
                              {tip}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}

          </div>
        )}

      </main>
    </div>
  );
}
