export interface UserProfile {
  age: number | null;
  gender: string | null;
  height: number | null;
  weight: number | null;
  bmi: number | null;
  athlete_status: boolean;
  sport_type: string | null;
  training_frequency: string | null;
  resting_heart_rate: number | null;
  medical_history: string[];
  smoking: boolean;
  alcohol: boolean;
  pregnant?: boolean;
}

export interface SmartwatchVitals {
  heart_rate: string;
  spo2: string;
  systolic_bp: string;
  diastolic_bp: string;
  steps: string;
  risk_level: string;
}

export interface UserInputs {
  preference: string;
  allergies: string;
  goal: string;
  budget: string;
}

export interface EvaluationContext {
  age_years: number;
  gender: string;
  height: number;
  weight: number;
  bmi: number;
  athlete_status: boolean;
  sport_type: string;
  training_frequency: string;
  resting_heart_rate: number;
  medical_history: string[];
  smoking: boolean;
  alcohol: boolean;
  
  // Vitals
  heart_rate: number;
  systolic_bp: number;
  diastolic_bp: number;
  spo2: number;
  steps: number;
  risk_level: string;
  
  // Interactive choices
  preference: string;
  allergies: string;
  goal: string;
  budget: string;
  
  // Dynamically computed metrics for trigger matching
  estimated_daily_salt_g: number;
  estimated_daily_sodium_mg: number;
  sodium_reduction_goal: boolean;
  reducing_free_sugar_intake: boolean;
  post_exercise: boolean;
  body_weight_loss_during_exercise_kg: number;
  pre_exercise_meal_planning: boolean;
  exercise_duration_minutes: number;
  during_exercise: boolean;
  environment: string;
  protein_g_per_kg: number;
  post_resistance_exercise: boolean;
  protein_dosing_recommendation: boolean;
  daily_protein_planning: boolean;
  time_of_day: string;
  phase: string;
  meal_planning: boolean;
  fat_consumption: boolean;
  always_applicable: boolean;
  
  // Nested structure matching triggers like "user.condition"
  user: {
    activity_level: string;
    age_category: string;
    condition: string[];
    bmi_category: string;
    sport_type: string;
    muscle_building_goal: boolean;
    red_meat_frequency: string;
    weight_loss_treatment_active: boolean;
    pregnant: boolean;
  };
  
  infant_age_months: number;
}

export interface ClinicalRule {
  rule_id: string;
  organization: string;
  guideline_name: string;
  publication_year: number;
  url: string;
  clinical_topic: string;
  target_population: string;
  trigger: string;
  recommendation: string;
  evidence_strength: string;
  guideline_strength?: string;
  page_number?: string;
  contraindications?: string;
  safe_for_automation: boolean;
  manual_review_required: boolean;
  manual_review_reason?: string;
  conflict_ref?: string;
  note?: string;
}

export interface ConsensusRule {
  consensus_id: string;
  topic: string;
  supporting_orgs: string[];
  note: string;
}

export interface ConflictSource {
  org: string;
  value: string;
}

export interface ClinicalConflict {
  conflict_id: string;
  topic: string;
  source_a: ConflictSource;
  source_b: ConflictSource;
  resolution: string;
}

export interface RuleEngineResult {
  activeRules: ClinicalRule[];
  manualReviewRules: ClinicalRule[];
  conflictsDetected: ClinicalConflict[];
  consensusMatched: ConsensusRule[];
}

export interface EvaluatedRecommendation {
  recommendation: string;
  source: string;
  evidence: string;
  ruleId: string;
}

export interface DietPlanOutput {
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  fiber: number;
  water: number;
  sodium: number;
  sugar: number;
  meals: {
    breakfast: string;
    morning_snack: string;
    lunch: string;
    evening_snack: string;
    dinner: string;
  };
  foods_to_prefer: string[];
  foods_to_limit: string[];
  rules_matched: ClinicalRule[];
  conflicts_detected: ClinicalConflict[];
  consensus_matched: ConsensusRule[];
  lifestyle_advice: string[];
}
