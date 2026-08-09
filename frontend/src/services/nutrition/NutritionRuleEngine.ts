import { 
  UserProfile, SmartwatchVitals, UserInputs, EvaluationContext, 
  ClinicalRule, ConsensusRule, ClinicalConflict, RuleEngineResult 
} from "./NutritionTypes";
import { CLINICAL_RULES, CONSENSUS_RULES, CLINICAL_CONFLICTS } from "./NutritionRuleBook";
import { evaluateTrigger } from "./NutritionRuleEvaluator";

/**
 * Builds a structured EvaluationContext from raw patient, smartwatch, and input data.
 * Translates live patient sensors into clinical trigger variables.
 */
export function buildEvaluationContext(
  profile: UserProfile | null,
  vitals: SmartwatchVitals,
  inputs: UserInputs
): EvaluationContext {
  const age_years = profile?.age || 30;
  const gender = profile?.gender || "Male";
  const height = profile?.height || 170; // cm
  const weight = profile?.weight || 70; // kg
  
  // Calculate BMI dynamically if missing
  const bmi = profile?.bmi || parseFloat((weight / ((height / 100) * (height / 100))).toFixed(2));
  
  const athlete_status = profile?.athlete_status || false;
  const sport_type = profile?.sport_type || "None";
  const training_frequency = profile?.training_frequency || "Rarely";
  const resting_heart_rate = profile?.resting_heart_rate || 72;
  const medical_history = profile?.medical_history || [];
  const smoking = profile?.smoking || false;
  const alcohol = profile?.alcohol || false;
  
  // Parse vitals
  const heart_rate = parseFloat(vitals.heart_rate) || 72;
  const systolic_bp = parseFloat(vitals.systolic_bp) || 120;
  const diastolic_bp = parseFloat(vitals.diastolic_bp) || 80;
  const spo2 = parseFloat(vitals.spo2) || 98;
  const steps = parseFloat(vitals.steps) || 5000;
  const risk_level = vitals.risk_level || "Normal";
  
  const preference = inputs.preference;
  const allergies = inputs.allergies;
  const goal = inputs.goal;
  const budget = inputs.budget;
  
  // 🩺 Smartwatch-to-Clinical Variable Translation (Linking sensors directly to triggers)
  // If BP is high (>120/80), we simulate daily salt/sodium as elevated to trigger DASH rules
  const isBPElevated = systolic_bp > 120 || diastolic_bp > 80;
  const estimated_daily_salt_g = isBPElevated ? 6.5 : 4.0;
  const estimated_daily_sodium_mg = isBPElevated ? 2600 : 1600;
  
  const sodium_reduction_goal = isBPElevated || medical_history.includes("Hypertension");
  const reducing_free_sugar_intake = medical_history.includes("Diabetes") || goal === "Weight Loss";
  
  // Sports metabolic variables
  const post_exercise = athlete_status;
  const body_weight_loss_during_exercise_kg = athlete_status ? 1.0 : 0.0;
  const pre_exercise_meal_planning = athlete_status;
  const exercise_duration_minutes = athlete_status ? 90 : 0;
  const during_exercise = athlete_status;
  const environment = "normal";
  const protein_g_per_kg = athlete_status ? 1.2 : 0.8;
  const post_resistance_exercise = athlete_status && sport_type.toLowerCase().includes("strength");
  const protein_dosing_recommendation = athlete_status;
  const daily_protein_planning = athlete_status;
  
  // Nested structure matching triggers like "user.condition"
  let activity_level = "sedentary";
  if (steps > 10000 || (athlete_status && training_frequency === "Daily")) {
    activity_level = "athlete";
  } else if (steps > 6000 || training_frequency !== "Rarely") {
    activity_level = "regular_exerciser";
  }
  
  const age_category = age_years <= 19 ? "adolescent" : "adult";
  
  let bmi_category = "normal";
  if (bmi < 18.5) bmi_category = "underweight";
  else if (bmi >= 30) bmi_category = "obese";
  else if (bmi >= 25) bmi_category = "overweight";

  // Map sport categories to rules trigger (endurance, strength_power, intermittent, ultra_endurance)
  let sportTypeLower = sport_type.toLowerCase();
  let mappedSportType = "none";
  if (sportTypeLower.includes("run") || sportTypeLower.includes("swim") || sportTypeLower.includes("cycl")) {
    mappedSportType = "endurance";
  } else if (sportTypeLower.includes("lift") || sportTypeLower.includes("gym") || sportTypeLower.includes("strength")) {
    mappedSportType = "strength_power";
  } else if (sportTypeLower.includes("foot") || sportTypeLower.includes("basket") || sportTypeLower.includes("tenn")) {
    mappedSportType = "intermittent";
  } else if (sportTypeLower.includes("ultra") || sportTypeLower.includes("marathon")) {
    mappedSportType = "ultra_endurance";
  }

  const muscle_building_goal = goal === "Muscle Gain";
  const red_meat_frequency = preference === "Non Vegetarian" ? "high" : "none";
  const weight_loss_treatment_active = goal === "Weight Loss";
  const pregnant = profile?.pregnant || false;

  return {
    age_years,
    gender,
    height,
    weight,
    bmi,
    athlete_status,
    sport_type: sport_type,
    training_frequency,
    resting_heart_rate,
    medical_history,
    smoking,
    alcohol,
    heart_rate,
    systolic_bp,
    diastolic_bp,
    spo2,
    steps,
    risk_level,
    preference,
    allergies,
    goal,
    budget,
    estimated_daily_salt_g,
    estimated_daily_sodium_mg,
    sodium_reduction_goal,
    reducing_free_sugar_intake,
    post_exercise,
    body_weight_loss_during_exercise_kg,
    pre_exercise_meal_planning,
    exercise_duration_minutes,
    during_exercise,
    environment,
    protein_g_per_kg,
    post_resistance_exercise,
    protein_dosing_recommendation,
    daily_protein_planning,
    time_of_day: "before_sleep",
    phase: "training",
    meal_planning: true,
    fat_consumption: true,
    always_applicable: true,
    user: {
      activity_level,
      age_category,
      condition: medical_history,
      bmi_category,
      sport_type: mappedSportType,
      muscle_building_goal,
      red_meat_frequency,
      weight_loss_treatment_active,
      pregnant
    },
    infant_age_months: 0 // Default adult context
  };
}

/**
 * Runs the CDSS Rule Engine against the patient context.
 * Identifies active rules, manual clinician check flags, conflicts, and consensus guidelines.
 */
export function runCDSSRuleEngine(
  profile: UserProfile | null,
  vitals: SmartwatchVitals,
  inputs: UserInputs
): RuleEngineResult {
  const context = buildEvaluationContext(profile, vitals, inputs);
  
  const activeRules: ClinicalRule[] = [];
  const manualReviewRules: ClinicalRule[] = [];
  const conflictsDetected: ClinicalConflict[] = [];
  const consensusMatched: ConsensusRule[] = [];

  // 1. Evaluate triggers for all 70 guidelines in the rulebook
  for (const rule of CLINICAL_RULES) {
    const isTriggered = evaluateTrigger(rule.trigger, context);
    if (isTriggered) {
      if (rule.manual_review_required) {
        manualReviewRules.push(rule);
      } else {
        activeRules.push(rule);
      }
    }
  }

  // 2. Identify clinical conflicts based on active rules
  const activeRuleIds = new Set(activeRules.concat(manualReviewRules).map(r => r.rule_id));
  
  for (const conflict of CLINICAL_CONFLICTS) {
    if (conflict.conflict_id === "CONF-01") {
      // Sodium conflict triggers if both WHO/ICMR-NIN (<5g salt) AND NHLBI DASH (2300mg sodium) rules fire
      const hasWHO = activeRuleIds.has("NUT-WHO-15") || activeRuleIds.has("NUT-ICMR-01");
      const hasNHLBI = activeRuleIds.has("NUT-NHLBI-01") || activeRuleIds.has("NUT-NHLBI-02");
      if (hasWHO && hasNHLBI) {
        conflictsDetected.push(conflict);
      }
    } else if (conflict.conflict_id === "CONF-02") {
      // Protein supplementation conflict triggers if ISSN protein rule AND ICMR-NIN supplement caution rule fire
      const hasISSN = activeRuleIds.has("NUT-ISSN-01") || activeRuleIds.has("NUT-ISSN-05") || activeRuleIds.has("NUT-ISSN-06");
      const hasICMR = activeRuleIds.has("NUT-ICMR-09");
      if (hasISSN && hasICMR) {
        conflictsDetected.push(conflict);
      }
    }
  }

  // 3. Identify consensus guidelines based on active rules
  for (const consensus of CONSENSUS_RULES) {
    // Check if at least one rule from the supporting organizations is active
    const activeOrgs = new Set(activeRules.map(r => r.organization));
    const matchingOrgsCount = consensus.supporting_orgs.filter(org => activeOrgs.has(org)).length;
    
    // If at least two supporting clinical organizations have active rules on this topic, mark consensus
    if (matchingOrgsCount >= 2) {
      consensusMatched.push(consensus);
    }
  }

  return {
    activeRules,
    manualReviewRules,
    conflictsDetected,
    consensusMatched
  };
}
