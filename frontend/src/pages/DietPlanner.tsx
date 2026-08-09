import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../services/supabase";
import {
  Activity, ArrowLeft, Apple, ShieldCheck, Heart, User, Check, Info,
  TrendingUp, Award, Compass, AlertTriangle, AlertCircle, Droplet,
  ChevronRight, RefreshCw, FileText, DollarSign, Ban, BookOpen, Utensils
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
    // Automatically injects profile, vitals and questionnaire choices into Rule Engine
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
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-100">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        .serif { font-family: 'Instrument Serif', serif; }
      `}</style>

      {/* SIDEBAR */}
      <aside className="hidden lg:flex flex-col w-72 bg-slate-50 border-r border-slate-200 p-8 fixed h-full">
        <div className="flex items-center gap-3 mb-12">
          <div className="bg-blue-600 p-2 rounded-xl shadow-lg"><Activity className="text-white" size={24} /></div>
          <span className="serif text-2xl">MedAI</span>
        </div>
        <nav className="flex-1 space-y-2">
          <button onClick={() => navigate("/patient")} className="w-full flex items-center justify-between p-4 rounded-2xl font-bold text-sm text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-all">
            <div className="flex items-center gap-3"><Compass size={20}/> Dashboard</div>
          </button>
          <button onClick={() => navigate("/patient")} className="w-full flex items-center justify-between p-4 rounded-2xl font-bold text-sm text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-all">
            <div className="flex items-center gap-3"><FileText size={20}/> Records</div>
          </button>
          <button onClick={() => navigate("/patient")} className="w-full flex items-center justify-between p-4 rounded-2xl font-bold text-sm text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-all">
            <div className="flex items-center gap-3"><Utensils size={20}/> Pharmacy & Meds</div>
          </button>
          <button className="w-full flex items-center justify-between p-4 rounded-2xl font-bold text-sm bg-white text-blue-600 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3"><Apple size={20}/> AI Diet Planner</div>
          </button>
        </nav>
        <button onClick={handleLogout} className="flex items-center gap-3 p-4 text-slate-400 font-bold text-sm hover:text-red-500 transition-colors"><User size={20}/> Sign Out</button>
      </aside>

      {/* MAIN CONTAINER */}
      <main className="flex-1 lg:ml-72 p-8 md:p-12 max-w-6xl mx-auto w-full space-y-10">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <button 
              onClick={() => navigate("/patient")} 
              className="flex items-center gap-2 text-slate-400 hover:text-slate-800 font-bold text-sm transition-colors mb-2"
            >
              <ArrowLeft size={16}/> Back to Dashboard
            </button>
            <h1 className="serif text-5xl md:text-6xl text-slate-900 tracking-tight leading-none">Clinical Nutrition CDSS</h1>
            <p className="text-slate-400 font-medium text-sm md:text-base">
              Evidence-Based Clinical Nutrition Decision Support System mapped to official WHO, AHA, NHLBI, ADA, ACSM, and ISSN rulebooks.
            </p>
          </div>
        </header>

        {/* WORKFLOW ROWS */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
          
          {/* LEFT PANEL: PROFILE & INTERACTION FORM (2/5 size) */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* PATIENT DOSSIER CARD */}
            <div className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-100 shadow-lg space-y-5">
              <h3 className="serif text-2xl text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
                <ShieldCheck className="text-blue-600" size={20} /> Clinical Patient Dossier
              </h3>
              
              {loadingDossier ? (
                <div className="flex justify-center items-center py-6 text-slate-400 text-sm gap-2">
                  <RefreshCw className="animate-spin" size={16} /> Syncing smartwatch logs...
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-3.5 rounded-2xl">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Height & Weight</span>
                      <span className="text-sm font-bold text-slate-700">
                        {healthProfile?.height || 170} cm / {healthProfile?.weight || 70} kg
                      </span>
                    </div>
                    <div className="bg-slate-50 p-3.5 rounded-2xl">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Calculated BMI</span>
                      <span className="text-sm font-bold text-slate-700">
                        {healthProfile?.bmi || parseFloat(((healthProfile?.weight || 70) / (((healthProfile?.height || 170) / 100) * ((healthProfile?.height || 170) / 100))).toFixed(2))}
                      </span>
                    </div>
                    <div className="bg-slate-50 p-3.5 rounded-2xl">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Blood Pressure</span>
                      <span className="text-sm font-bold text-slate-700">
                        {vitals.systolic_bp}/{vitals.diastolic_bp} mmHg
                      </span>
                    </div>
                    <div className="bg-slate-50 p-3.5 rounded-2xl">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Daily Steps</span>
                      <span className="text-sm font-bold text-slate-700">
                        {parseInt(vitals.steps).toLocaleString()} steps
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Medical Conditions</span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {healthProfile?.medical_history && healthProfile.medical_history.length > 0 && !healthProfile.medical_history.includes("None") ? (
                          healthProfile.medical_history.map((cond, idx) => (
                            <span key={idx} className="bg-rose-50 border border-rose-100 text-rose-600 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                              {cond}
                            </span>
                          ))
                        ) : (
                          <span className="bg-emerald-50 border border-emerald-100 text-emerald-600 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                            No Active Pathologies
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="pt-1">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Athlete Profile</span>
                      <span className="text-xs font-bold text-slate-600 block mt-0.5">
                        {healthProfile?.athlete_status ? (
                          <span className="text-blue-600 font-extrabold">
                            Active Athlete ({healthProfile.sport_type} | {healthProfile.training_frequency})
                          </span>
                        ) : (
                          "Non-Athlete (Standard Caloric Metabolism)"
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* FORM */}
            <form onSubmit={handleGenerate} className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-100 shadow-lg space-y-6">
              <h3 className="serif text-2xl text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
                <Utensils className="text-blue-600" size={20} /> Decision Parameters
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Food Preference</label>
                  <select
                    value={userInputs.preference}
                    onChange={(e) => setUserInputs({ ...userInputs, preference: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-2xl outline-none font-medium text-sm text-slate-700"
                  >
                    <option value="Vegetarian">Vegetarian (Includes dairy)</option>
                    <option value="Non Vegetarian">Non-Vegetarian (Eggs, Poultry, Fish)</option>
                    <option value="Vegan">Vegan (Plant-based only)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Food Allergies</label>
                  <input
                    type="text"
                    value={userInputs.allergies}
                    onChange={(e) => setUserInputs({ ...userInputs, allergies: e.target.value })}
                    placeholder="e.g. Gluten, Nuts, Dairy"
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-2xl outline-none font-medium text-sm placeholder:text-slate-300"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block leading-tight">
                    *The CDSS dynamic rulebook evaluator replaces elements on matching allergen triggers.
                  </span>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Dietary Goal</label>
                  <select
                    value={userInputs.goal}
                    onChange={(e) => setUserInputs({ ...userInputs, goal: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-2xl outline-none font-medium text-sm text-slate-700"
                  >
                    <option value="Weight Loss">Weight Loss (Caloric Deficit)</option>
                    <option value="Weight Gain">Weight Gain (Caloric Surplus)</option>
                    <option value="Maintain Weight">Maintain Healthy Weight</option>
                    <option value="Muscle Gain">Muscle Gain (High Protein Hypertrophy)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Budget Setting (Optional Metadata)</label>
                  <select
                    value={userInputs.budget}
                    onChange={(e) => setUserInputs({ ...userInputs, budget: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-2xl outline-none font-medium text-sm text-slate-700"
                  >
                    <option value="Low">Low Budget (Affordable local options)</option>
                    <option value="Medium">Medium Budget (Standard grocery balance)</option>
                    <option value="High">Premium Budget (Includes organic superfoods)</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={generating || loadingDossier}
                className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl mt-2 hover:bg-blue-600 transition-all shadow-xl shadow-slate-200 disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {generating ? (
                  <>
                    <RefreshCw className="animate-spin" size={18} /> Consulting Rulebook...
                  </>
                ) : (
                  <>
                    <Apple size={18} /> Execute Nutrition CDSS
                  </>
                )}
              </button>
            </form>
          </div>

          {/* RIGHT PANEL: CALCULATED DIET PLAN (3/5 size) */}
          <div className="lg:col-span-3 space-y-8">
            
            {!generatedPlan ? (
              <div className="bg-white p-12 rounded-[40px] border border-slate-100 shadow-lg text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                  <BookOpen size={28} />
                </div>
                <h3 className="serif text-3xl text-slate-800">Rule Engine Active</h3>
                <p className="text-slate-400 text-sm max-w-sm mx-auto">
                  Click the button to run the clinical rulebook evaluator. Vitals and profiles will be mapped dynamically to guidelines.
                </p>
              </div>
            ) : (
              <div className="space-y-8 animate-in fade-in duration-500">
                
                {/* SECTION 1: PERSONALIZED NUTRITION SUMMARY */}
                <div className="bg-white p-8 rounded-[36px] border border-slate-100 shadow-xl space-y-4">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Section 1: Personalized Nutrition Summary</span>
                  <div className="bg-blue-50 border border-blue-100 p-6 rounded-3xl">
                    <h4 className="text-xs font-black uppercase text-blue-600 tracking-wider">Current Medical & Nutrition Goal</h4>
                    <p className="serif text-3xl text-slate-950 mt-2 font-bold">{getPersonalizedGoalTitle()}</p>
                    <p className="text-xs text-slate-500 mt-2 font-medium">
                      Calculated dynamically by the CDSS rulebook trigger evaluator using profile data and active smartwatch triage thresholds.
                    </p>
                  </div>
                </div>

                {/* CLINICAL CONFLICTS & CONSENSUS PANEL */}
                {(generatedPlan.conflicts_detected.length > 0 || generatedPlan.consensus_matched.length > 0) && (
                  <div className="bg-white p-8 rounded-[36px] border border-slate-100 shadow-xl space-y-6">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Clinical Policy & Consensus Dashboard</span>
                    
                    {/* Conflicts */}
                    {generatedPlan.conflicts_detected.length > 0 && (
                      <div className="space-y-4">
                        <h4 className="text-xs font-black text-rose-600 uppercase tracking-wider flex items-center gap-2">
                          <AlertTriangle size={16} /> Active Clinical Conflict Warnings
                        </h4>
                        <div className="space-y-3">
                          {generatedPlan.conflicts_detected.map((conflict, idx) => (
                            <div key={idx} className="bg-rose-50 border border-rose-100 p-5 rounded-2xl space-y-2">
                              <span className="text-xs font-bold text-rose-700 block">{conflict.conflict_id}: {conflict.topic}</span>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600 py-1">
                                <div className="bg-white/60 p-2.5 rounded-xl border border-rose-100">
                                  <strong>{conflict.source_a.org} Position:</strong> {conflict.source_a.value}
                                </div>
                                <div className="bg-white/60 p-2.5 rounded-xl border border-rose-100">
                                  <strong>{conflict.source_b.org} Position:</strong> {conflict.source_b.value}
                                </div>
                              </div>
                              <p className="text-xs text-slate-500 leading-relaxed font-semibold italic">
                                <strong>Resolution Policy:</strong> {conflict.resolution}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Consensus */}
                    {generatedPlan.consensus_matched.length > 0 && (
                      <div className="space-y-4 border-t border-slate-100 pt-6">
                        <h4 className="text-xs font-black text-emerald-600 uppercase tracking-wider flex items-center gap-2">
                          <ShieldCheck size={16} /> Consensus Guideline Aligments
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {generatedPlan.consensus_matched.map((consensus, idx) => (
                            <div key={idx} className="bg-emerald-50 border border-emerald-100 px-4 py-3 rounded-2xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
                              <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full"></span>
                              <span>{consensus.topic} (Consensus of {consensus.supporting_orgs.join(", ")})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* SECTION 2: CLINICAL RECOMMENDATIONS */}
                <div className="bg-white p-8 rounded-[36px] border border-slate-100 shadow-xl space-y-6">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Section 2: Clinical Recommendations</span>
                  
                  <div className="space-y-4">
                    {generatedPlan.rules_matched.map((rule, idx) => (
                      <div key={idx} className="flex gap-4 items-start p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-xl font-black text-xs uppercase text-center min-w-[80px] border border-blue-100">
                          {rule.organization}
                        </div>
                        <div className="flex-1 space-y-1">
                          <h5 className="text-sm font-extrabold text-slate-800">{rule.recommendation}</h5>
                          <div className="flex gap-2 items-center flex-wrap pt-1">
                            <span className="text-[9px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                              Topic: {rule.clinical_topic}
                            </span>
                            <span className="text-[9px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                              Evidence: {formatEvidenceLevel(rule.evidence_strength)}
                            </span>
                            {rule.guideline_strength && rule.guideline_strength !== "NOT SUPPORTED BY PROVIDED SOURCES" && (
                              <span className="text-[9px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                {rule.guideline_strength}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* SECTION 3: DAILY MEAL PLAN */}
                <div className="bg-white p-8 rounded-[36px] border border-slate-100 shadow-xl space-y-6">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Section 3: Daily Meal Plan</span>
                  
                  <div className="space-y-4">
                    <div className="flex gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                      <div className="w-24 bg-blue-100 text-blue-700 text-center py-2 px-1 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center">Breakfast</div>
                      <div className="flex-1 text-slate-700 text-sm font-medium self-center">{generatedPlan.meals.breakfast}</div>
                    </div>

                    <div className="flex gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                      <div className="w-24 bg-indigo-100 text-indigo-700 text-center py-2 px-1 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center">Snacks (AM)</div>
                      <div className="flex-1 text-slate-700 text-sm font-medium self-center">{generatedPlan.meals.morning_snack}</div>
                    </div>

                    <div className="flex gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                      <div className="w-24 bg-emerald-100 text-emerald-700 text-center py-2 px-1 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center">Lunch</div>
                      <div className="flex-1 text-slate-700 text-sm font-medium self-center">{generatedPlan.meals.lunch}</div>
                    </div>

                    <div className="flex gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                      <div className="w-24 bg-indigo-100 text-indigo-700 text-center py-2 px-1 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center">Snacks (PM)</div>
                      <div className="flex-1 text-slate-700 text-sm font-medium self-center">{generatedPlan.meals.evening_snack}</div>
                    </div>

                    <div className="flex gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                      <div className="w-24 bg-violet-100 text-violet-700 text-center py-2 px-1 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center">Dinner</div>
                      <div className="flex-1 text-slate-700 text-sm font-medium self-center">{generatedPlan.meals.dinner}</div>
                    </div>

                    <div className="flex gap-4 p-4 rounded-2xl bg-sky-50 border border-sky-100">
                      <div className="w-24 bg-sky-100 text-sky-700 text-center py-2 px-1 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center">Hydration</div>
                      <div className="flex-1 text-slate-700 text-sm font-medium self-center">
                        Consume at least <strong>{generatedPlan.water} Liters</strong> of clean water daily to offset cellular dehydration (ACSM Guideline).
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION 4: FOODS TO PREFER */}
                <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-xl space-y-4">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Section 4: Foods to Prefer</span>
                  <div className="flex flex-wrap gap-1.5">
                    {generatedPlan.foods_to_prefer.map((food, idx) => (
                      <span key={idx} className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-black uppercase tracking-wider px-3.5 py-2 rounded-xl">
                        {food}
                      </span>
                    ))}
                  </div>
                </div>

                {/* SECTION 5: FOODS TO LIMIT */}
                <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-xl space-y-4">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Section 5: Foods to Limit / Avoid</span>
                  <div className="flex flex-wrap gap-1.5">
                    {generatedPlan.foods_to_limit.map((food, idx) => (
                      <span key={idx} className="bg-rose-50 text-rose-700 border border-rose-100 text-[10px] font-black uppercase tracking-wider px-3.5 py-2 rounded-xl">
                        {food}
                      </span>
                    ))}
                  </div>
                </div>

                {/* SECTION 6: PERSONALIZED NUTRITION TARGETS */}
                <div className="bg-white p-8 rounded-[36px] border border-slate-100 shadow-xl space-y-6">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Section 6: Personalized Nutrition Targets</span>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-900 text-white p-5 rounded-2xl flex flex-col justify-between">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Energy Intake</span>
                      <div>
                        <span className="serif text-3xl font-bold">{generatedPlan.calories}</span>
                        <span className="text-xs text-slate-400 block">kcal</span>
                      </div>
                    </div>
                    
                    <div className="bg-slate-50 p-5 rounded-2xl flex flex-col justify-between border border-slate-100">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Protein Target</span>
                      <div>
                        <span className="serif text-3xl font-bold">{generatedPlan.protein}</span>
                        <span className="text-xs text-slate-400 block">g</span>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-5 rounded-2xl flex flex-col justify-between border border-slate-100">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Carbohydrates</span>
                      <div>
                        <span className="serif text-3xl font-bold">{generatedPlan.carbohydrates}</span>
                        <span className="text-xs text-slate-400 block">g</span>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-5 rounded-2xl flex flex-col justify-between border border-slate-100">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Dietary Fats</span>
                      <div>
                        <span className="serif text-3xl font-bold">{generatedPlan.fat}</span>
                        <span className="text-xs text-slate-400 block">g</span>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-5 rounded-2xl flex flex-col justify-between border border-slate-100">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Dietary Fiber</span>
                      <div>
                        <span className="serif text-3xl font-bold">{generatedPlan.fiber}</span>
                        <span className="text-xs text-slate-400 block">g</span>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-5 rounded-2xl flex flex-col justify-between border border-slate-100">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Water Intake</span>
                      <div>
                        <span className="serif text-3xl font-bold">{generatedPlan.water}</span>
                        <span className="text-xs text-slate-400 block">Liters</span>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-5 rounded-2xl flex flex-col justify-between border border-slate-100">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sodium Limit</span>
                      <div>
                        <span className="serif text-3xl font-bold">{generatedPlan.sodium}</span>
                        <span className="text-xs text-slate-400 block">mg</span>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-5 rounded-2xl flex flex-col justify-between border border-slate-100">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sugar Ceiling</span>
                      <div>
                        <span className="serif text-3xl font-bold">{generatedPlan.sugar}</span>
                        <span className="text-xs text-slate-400 block">g</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION 7: RULE TRANSPARENCY */}
                <div className="bg-white p-8 rounded-[36px] border border-slate-100 shadow-xl space-y-6">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Section 7: Rule Transparency Trail</span>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 font-extrabold">
                          <th className="py-3 px-2">Clinical Rule ID</th>
                          <th className="py-3 px-2">Organization</th>
                          <th className="py-3 px-2">Guideline & Topic</th>
                          <th className="py-3 px-2">Evidence Level</th>
                          <th className="py-3 px-2">Publication & URL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {generatedPlan.rules_matched.map((rule, idx) => (
                          <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                            <td className="py-3.5 px-2 font-mono font-bold text-slate-700">{rule.rule_id}</td>
                            <td className="py-3.5 px-2">
                              <span className="bg-blue-50 text-blue-700 font-bold px-2.5 py-0.5 rounded-full border border-blue-100">
                                {rule.organization}
                              </span>
                            </td>
                            <td className="py-3.5 px-2 font-medium text-slate-800">
                              {rule.guideline_name}
                              <span className="block text-[10px] text-slate-400 font-semibold mt-0.5">
                                Topic: {rule.clinical_topic}
                              </span>
                            </td>
                            <td className="py-3.5 px-2">
                              <span className={`font-bold uppercase tracking-wider text-[9px] ${
                                rule.evidence_strength === "HIGH" ? "text-emerald-600" :
                                rule.evidence_strength === "MODERATE" ? "text-amber-600" : "text-slate-500"
                              }`}>
                                {rule.evidence_strength}
                              </span>
                            </td>
                            <td className="py-3.5 px-2 text-[10px] text-slate-400">
                              {rule.publication_year} | 
                              <a href={rule.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline inline-flex items-center gap-0.5 ml-1 font-bold">
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
                  <div className="bg-slate-900 text-white p-8 rounded-[36px] border border-slate-800 shadow-2xl space-y-5">
                    <span className="text-[9px] bg-slate-800 text-emerald-400 font-bold uppercase tracking-widest px-3 py-1 rounded-full border border-slate-700 inline-block">
                      Section 8: AI Explanation
                    </span>
                    
                    <div className="flex justify-between items-center border-b border-slate-850 pb-2">
                      <h3 className="serif text-3xl text-white flex items-center gap-2">
                        <Activity size={24} className="text-emerald-400 animate-pulse" /> Why these recommendations were selected
                      </h3>
                    </div>

                    {geminiLoading ? (
                      <div className="py-8 flex flex-col justify-center items-center gap-3 text-slate-400 text-sm">
                        <RefreshCw className="animate-spin text-emerald-400" size={24} />
                        <span>Gemini is generating natural language justifications...</span>
                      </div>
                    ) : (
                      geminiExplanation && (
                        <div className="space-y-6">
                          <p className="text-sm leading-relaxed text-slate-200 font-medium italic">
                            "{geminiExplanation.explanation}"
                          </p>
                          
                          <div className="space-y-3 pt-2">
                            <span className="text-[10px] font-black uppercase text-emerald-400 tracking-widest block">Personalized Clinical Insights:</span>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              {geminiExplanation.personalized_tips.map((tip, idx) => (
                                <div key={idx} className="bg-slate-800/40 p-4 rounded-2xl border border-slate-800 text-xs text-slate-300 leading-relaxed">
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
            
          </div>

        </div>

      </main>
    </div>
  );
}
