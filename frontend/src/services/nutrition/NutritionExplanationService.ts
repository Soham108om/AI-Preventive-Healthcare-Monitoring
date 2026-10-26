import { UserProfile, SmartwatchVitals, UserInputs, DietPlanOutput } from "./NutritionTypes";
import { API_BASE_URL } from "../../apiConfig";

export interface GeminiExplanation {
  explanation: string;
  personalized_tips: string[];
}

export interface AiDietPlanOutput {
  title: string;
  clinical_summary: string;
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
  personalized_tips: string[];
  ai_insights: string[];
}

/**
 * Fetches the AI explanation layer from the Flask backend.
 * Returns the parsed JSON or throws an error if unavailable.
 */
export async function fetchNutritionExplanation(
  dietPlan: DietPlanOutput,
  profile: UserProfile | null,
  vitals: SmartwatchVitals,
  inputs: UserInputs
): Promise<GeminiExplanation> {
  const response = await fetch(`${API_BASE_URL}/diet_explain`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      diet_plan: {
        calories: dietPlan.calories,
        protein: dietPlan.protein,
        carbohydrates: dietPlan.carbohydrates,
        fat: dietPlan.fat,
        fiber: dietPlan.fiber,
        water: dietPlan.water,
        sodium: dietPlan.sodium,
        sugar: dietPlan.sugar,
        meals: dietPlan.meals,
        rules_matched: dietPlan.rules_matched.map(r => ({
          rule: r.clinical_topic,
          source: r.organization
        }))
      },
      patient_profile: profile || {
        age: 30,
        height: 170,
        weight: 70,
        bmi: 24.2,
        athlete_status: false,
        medical_history: []
      },
      vitals: vitals,
      user_inputs: inputs
    })
  });

  if (!response.ok) {
    throw new Error(`Explanation server returned error status ${response.status}`);
  }

  const data = await response.json();
  if (data.success && data.data) {
    return data.data as GeminiExplanation;
  }
  
  throw new Error(data.error || "Explanation generation returned failure");
}

/**
 * Fetches a dynamic, custom AI-generated diet plan from the backend (Option 2).
 */
export async function fetchAiGeneratedDietPlan(
  profile: UserProfile | null,
  vitals: SmartwatchVitals,
  inputs: UserInputs
): Promise<AiDietPlanOutput> {
  const response = await fetch(`${API_BASE_URL}/generate_ai_diet`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      patient_profile: profile || {
        age: 30,
        height: 170,
        weight: 70,
        bmi: 24.2,
        athlete_status: false,
        medical_history: []
      },
      vitals: vitals,
      user_inputs: inputs
    })
  });

  if (!response.ok) {
    throw new Error(`AI Diet server returned error status ${response.status}`);
  }

  const data = await response.json();
  if (data.success && data.data) {
    return data.data as AiDietPlanOutput;
  }

  throw new Error(data.error || "AI Diet generation returned failure");
}
