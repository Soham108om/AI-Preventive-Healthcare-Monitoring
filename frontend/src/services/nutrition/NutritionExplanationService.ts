import { UserProfile, SmartwatchVitals, UserInputs, DietPlanOutput } from "./NutritionTypes";

export interface GeminiExplanation {
  explanation: string;
  personalized_tips: string[];
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
  const response = await fetch("http://localhost:5000/diet_explain", {
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
