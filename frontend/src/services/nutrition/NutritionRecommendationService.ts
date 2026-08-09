import { 
  UserProfile, SmartwatchVitals, UserInputs, DietPlanOutput, 
  ClinicalRule, ConsensusRule, ClinicalConflict 
} from "./NutritionTypes";
import { runCDSSRuleEngine, buildEvaluationContext } from "./NutritionRuleEngine";

/**
 * Service to translate evaluated CDSS rules into target numeric guidelines,
 * meal plans, and food lists, adhering to the provided clinical rulebook.
 */
export function generateNutritionRecommendations(
  profile: UserProfile | null,
  vitals: SmartwatchVitals,
  inputs: UserInputs
): DietPlanOutput {
  // 1. Run CDSS rule engine to get activated rules, consensus, and conflicts
  const { activeRules, manualReviewRules, conflictsDetected, consensusMatched } = runCDSSRuleEngine(profile, vitals, inputs);
  const context = buildEvaluationContext(profile, vitals, inputs);
  
  const age = context.age_years;
  const weight = context.weight;
  const height = context.height;
  const steps = context.steps;
  const athleteStatus = context.athlete_status;
  const trainingFreq = context.training_frequency;
  const medical_history = context.medical_history;
  const preference = context.preference;
  const allergies = context.allergies.toLowerCase();
  const goal = context.goal;
  
  const isDiabetes = medical_history.includes("Diabetes");
  const isHypertension = medical_history.includes("Hypertension") || context.systolic_bp > 120 || context.diastolic_bp > 80;
  const isHeartDisease = medical_history.includes("Heart Disease");
  
  // 2. Base Energy Calculations (WHO / Mifflin-St Jeor / ACSM)
  const bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  
  let activityMultiplier = 1.2;
  if (steps > 12000 || (athleteStatus && trainingFreq === "Daily")) {
    activityMultiplier = 1.725;
  } else if (steps >= 8000 || trainingFreq === "3-4 times/week" || trainingFreq === "2-3 times/week") {
    activityMultiplier = 1.55;
  } else if (steps >= 5000 || trainingFreq === "1-2 times/week") {
    activityMultiplier = 1.375;
  }
  
  const tdee = bmr * activityMultiplier;
  
  // Apply Goal Caloric Offset
  let targetCalories = tdee;
  if (goal === "Weight Loss") {
    targetCalories = tdee - 500;
    // WHO caloric restriction floor protection
    const floor = 1500;
    if (targetCalories < floor) {
      targetCalories = floor;
    }
  } else if (goal === "Weight Gain") {
    targetCalories = tdee + 500;
  } else if (goal === "Muscle Gain") {
    targetCalories = tdee + 300;
  }
  targetCalories = Math.round(targetCalories);

  // 3. Macronutrients Calculations
  // Protein requirements (ISSN vs WHO)
  let proteinPerKg = 0.9;
  if (athleteStatus || goal === "Muscle Gain") {
    proteinPerKg = 1.8; // Middle of 1.4-2.0 g/kg/day ISSN guideline
  }
  const proteinGrams = Math.round(weight * proteinPerKg);
  const proteinCal = proteinGrams * 4;

  // Fat requirements (AHA vs WHO)
  let fatPercent = 0.25; // standard 25% fat
  if (isHeartDisease || isHypertension) {
    fatPercent = 0.20; // restricted fat budget for cardiovascular risk
  }
  const fatCal = targetCalories * fatPercent;
  const fatGrams = Math.round(fatCal / 9);

  // Carbohydrate requirements (remainder)
  const carbCal = targetCalories - (proteinCal + fatCal);
  const carbGrams = Math.round(carbCal / 4);

  // 4. Micronutrients & Fiber (WHO / NHLBI / ICMR-NIN)
  let fiberGrams = 25; // WHO standard age > 10
  if (age >= 2 && age <= 5) fiberGrams = 15;
  else if (age >= 6 && age <= 9) fiberGrams = 21;

  // Sodium limits (NHLBI / AHA)
  let sodiumMg = 2300; // standard NHLBI-01 ceiling
  if (isHypertension) {
    // Stricter target for elevated BP (NHLBI-02: 1500mg/day)
    sodiumMg = 1500; 
  }

  // Free Sugar limits (WHO-07 / ICMR-10)
  let sugarLimitPercent = 0.10; // WHO standard limit < 10%
  if (context.user.pregnant) {
    sugarLimitPercent = 0.05; // Pregnancy limit < 5% (ICMR-10)
  }
  const sugarGrams = Math.round((targetCalories * sugarLimitPercent) / 4);

  // Water Hydration target (ACSM)
  let waterLiters = 2.7;
  if (steps > 10000 || (athleteStatus && trainingFreq === "Daily")) {
    waterLiters = 3.7;
  } else if (steps > 6000 || trainingFreq !== "Rarely") {
    waterLiters = 3.2;
  }

  // 5. Foods to Prefer & Foods to Limit Lists
  const foodsToPrefer: string[] = [];
  const foodsToLimit: string[] = [];

  // Populate lists based on active rules
  if (activeRules.some(r => r.rule_id === "NUT-WHO-01" || r.rule_id === "NUT-AHA-02")) {
    foodsToPrefer.push("Fresh fruits & vegetables (400g+ daily)", "Leafy green vegetables");
  }
  if (activeRules.some(r => r.rule_id === "NUT-AHA-03")) {
    foodsToPrefer.push("Whole grains (Brown rice, Quinoa, Oats, Millets)");
    foodsToLimit.push("Refined grains (White flour/Maida, White bread)");
  }
  if (activeRules.some(r => r.rule_id === "NUT-AHA-04")) {
    foodsToPrefer.push("Plant proteins (Lentils, Tofu)", "Regular fish/seafood");
    foodsToLimit.push("Processed meats", "Red meat");
  }
  if (activeRules.some(r => r.rule_id === "NUT-AHA-05" || r.rule_id === "NUT-WHO-10")) {
    foodsToPrefer.push("Unsaturated fats (Olive oil, Canola oil, Avocado, Walnuts)");
    foodsToLimit.push("Saturated fat", "Trans fats", "Palm oil / Tropical oils");
  }
  if (activeRules.some(r => r.rule_id === "NUT-ICMR-07")) {
    foodsToLimit.push("HFSS (High Fat, Sugar, Salt) foods", "Ultra-processed foods (UPFs)");
  }
  if (isDiabetes) {
    foodsToPrefer.push("Low glycemic index foods (GI < 55)", "Legumes & pulses", "Moong sprouts");
    foodsToLimit.push("Added sugars", "Sweets & confectionery", "Sweetened beverages");
  }
  if (isHypertension) {
    foodsToPrefer.push("Potassium-rich foods (Bananas, Beetroot, Spinach)", "Low-sodium foods");
    foodsToLimit.push("Table salt", "Pickles & papad", "High-sodium canned foods");
  }
  if (isHeartDisease) {
    foodsToPrefer.push("Omega-3 fatty acid sources (Flaxseeds, Chia seeds, Fatty fish)", "Soluble dietary fiber");
    foodsToLimit.push("Butter", "Cream & ghee", "Deep fried foods");
  }

  // 6. Meal Generation matching preference, allergies, and clinical conditions
  let meals = {
    breakfast: "",
    morning_snack: "",
    lunch: "",
    evening_snack: "",
    dinner: ""
  };

  if (preference === "Vegan") {
    if (isDiabetes) {
      meals = {
        breakfast: "Besan Chilla (chickpea pancake) filled with spinach, onions, and tomatoes, served with mint chutney.",
        morning_snack: "Sprouted Moong (green gram) salad with cucumber, coriander, and freshly squeezed lemon juice.",
        lunch: "Sautéed Tempeh, quinoa brown rice blend, steamed spinach dal, and cucumber salad.",
        evening_snack: "A handful of roasted pumpkin seeds and unsweetened almond milk.",
        dinner: "Tofu stir-fry with broccoli, bell peppers, and mushrooms, served with yellow lentil soup."
      };
    } else if (isHypertension || isHeartDisease) {
      meals = {
        breakfast: "Oats porridge cooked in soy milk, topped with ground flaxseeds and fresh blueberries.",
        morning_snack: "Cucumber slices and baby carrots with low-sodium hummus dip.",
        lunch: "Brown rice, low-sodium yellow dal, steamed methi (fenugreek) spinach, and a tomato-beetroot salad.",
        evening_snack: "Roasted unsalted makhana (foxnuts) and a glass of tender coconut water.",
        dinner: "Grilled Tofu with garlic and herbs, served with boiled quinoa and steamed green beans."
      };
    } else {
      meals = {
        breakfast: "Vegetable oats upma with carrots, peas, and roasted peanuts, served with mint-coriander chutney.",
        morning_snack: "One medium apple and a handful of almonds.",
        lunch: "Brown rice, mixed vegetable curry (low oil), red kidney beans (rajma) dal, and green salad.",
        evening_snack: "Boiled chickpea (chana) chaat with onions, tomatoes, and chat masala.",
        dinner: "Tofu bhurji cooked with onions and tomatoes, served with two whole wheat chapatis."
      };
    }
  } else if (preference === "Vegetarian") {
    if (isDiabetes) {
      meals = {
        breakfast: "Besan Chilla (chickpea pancake) stuffed with grated low-fat paneer and spinach, served with mint chutney.",
        morning_snack: "Sprouted moong salad with a side of low-fat Greek yogurt.",
        lunch: "Ragi roti, yellow dal, sautéed bhindi (okra), and a large bowl of green cucumber salad.",
        evening_snack: "A handful of almonds and walnuts with black tea (no sugar).",
        dinner: "Sautéed tofu and broccoli with mixed vegetable soup and a small cup of brown rice."
      };
    } else if (isHypertension || isHeartDisease) {
      meals = {
        breakfast: "Oats porridge made in skimmed milk, topped with sliced banana, walnuts, and flaxseeds.",
        morning_snack: "Unsalted roasted makhana and sliced apples.",
        lunch: "Whole wheat chapati (no salt), low-sodium yellow dal tadka, boiled spinach, and a beetroot salad.",
        evening_snack: "Unsweetened low-fat yogurt with mixed berries and pumpkin seeds.",
        dinner: "Baked low-fat paneer cubes sautéed with bell peppers and tomatoes, served with quinoa."
      };
    } else {
      meals = {
        breakfast: "Oats upma with carrots and green peas, topped with roasted cashews, served with low-fat yogurt.",
        morning_snack: "Fresh papaya slices and a few almonds.",
        lunch: "Brown rice, paneer butter masala (cooked with low butter/cream), green gram dal, and salad.",
        evening_snack: "Boiled chickpea chaat with onions, coriander, and lemon juice.",
        dinner: "Paneer bhurji (scrambled cottage cheese) cooked with tomatoes, served with two whole wheat chapatis."
      };
    }
  } else {
    // Non-Vegetarian
    if (isDiabetes) {
      meals = {
        breakfast: "Omelet made with 3 egg whites, spinach, and mushrooms, served with 1 slice of whole-grain toast.",
        morning_snack: "Boiled sprouted sprouts salad with a side of unsweetened Greek yogurt.",
        lunch: "Grilled chicken breast, quinoa, stir-fried broccoli, and a cucumber-tomato salad.",
        evening_snack: "One hard-boiled egg and a handful of walnuts.",
        dinner: "Baked salmon or grilled fish fillet with steamed asparagus and sautéed green beans."
      };
    } else if (isHypertension || isHeartDisease) {
      meals = {
        breakfast: "Oats porridge made with skimmed milk and flaxseeds, served with 2 hard-boiled egg whites.",
        morning_snack: "Sliced apple with unsalted walnut halves.",
        lunch: "Grilled fish fillet (no added salt, seasoned with lemon and dill), brown rice, and steamed spinach.",
        evening_snack: "A cup of low-fat unsweetened Greek yogurt topped with a few fresh berries.",
        dinner: "Baked chicken breast (herb seasoned), quinoa, steamed broccoli, and baked sweet potato."
      };
    } else {
      meals = {
        breakfast: "Scrambled eggs (2 whole eggs) with tomatoes and spinach, served with whole wheat toast.",
        morning_snack: "Seasonal fresh fruit (orange or apple) and a handful of almonds.",
        lunch: "Chicken curry cooked in low oil, brown rice, yellow lentil soup, and cucumber salad.",
        evening_snack: "A bowl of boiled chickpea chaat or one hard-boiled egg.",
        dinner: "Grilled fish (Salmon or Pomfret) with mashed sweet potatoes and a side of sautéed broccoli."
      };
    }
  }

  // Apply Allergen Swapping
  if (allergies.includes("gluten") || allergies.includes("wheat")) {
    meals.breakfast = meals.breakfast.replace(/oats/gi, "gluten-free oats").replace(/toast/gi, "gluten-free toast").replace(/wheat/gi, "ragi").replace(/whole wheat/gi, "ragi");
    meals.lunch = meals.lunch.replace(/whole wheat chapati/gi, "ragi/millet chapati").replace(/roti/gi, "ragi roti");
    meals.dinner = meals.dinner.replace(/whole wheat/gi, "ragi").replace(/roti/gi, "ragi roti");
  }
  
  if (allergies.includes("nut") || allergies.includes("peanut")) {
    meals.breakfast = meals.breakfast.replace(/almond/gi, "chia seed").replace(/peanut/gi, "pumpkin seed").replace(/cashew/gi, "sunflower seed");
    meals.morning_snack = meals.morning_snack.replace(/walnut/gi, "sunflower seed").replace(/almond/gi, "pumpkin seed");
    meals.evening_snack = meals.evening_snack.replace(/walnut/gi, "sunflower seed").replace(/almond/gi, "pumpkin seed").replace(/peanut/gi, "chia seed");
  }

  if (allergies.includes("dairy") || allergies.includes("milk") || allergies.includes("lactose")) {
    meals.breakfast = meals.breakfast.replace(/skimmed milk/gi, "soy milk").replace(/yogurt/gi, "soy yogurt").replace(/paneer/gi, "tofu");
    meals.morning_snack = meals.morning_snack.replace(/yogurt/gi, "almond yogurt");
    meals.lunch = meals.lunch.replace(/paneer/gi, "tofu").replace(/yogurt/gi, "soy yogurt");
    meals.evening_snack = meals.evening_snack.replace(/yogurt/gi, "soy yogurt");
    meals.dinner = meals.dinner.replace(/paneer/gi, "tofu");
  }

  // 7. Lifestyle Advice
  const lifestyleAdvice: string[] = [];
  lifestyleAdvice.push("Prioritize drinking water 30 minutes before and after meals, not during (ICMR-NIN).");
  if (isHypertension) {
    lifestyleAdvice.push("Limit sodium consumption to under 1,500mg daily. Avoid adding table salt (AHA/NHLBI).");
  }
  if (isDiabetes) {
    lifestyleAdvice.push("Maintain strict 3-hour eating intervals. Do not skip major meals (ADA).");
  }
  if (athleteStatus) {
    lifestyleAdvice.push("Consume protein and carbs within a 45-minute window post-training (ISSN).");
  } else {
    lifestyleAdvice.push("Aim for at least 150 minutes of moderate physical activity (like brisk walking) per week (WHO).");
  }

  return {
    calories: targetCalories,
    protein: proteinGrams,
    carbohydrates: carbGrams,
    fat: fatGrams,
    fiber: fiberGrams,
    water: waterLiters,
    sodium: sodiumMg,
    sugar: sugarGrams,
    meals,
    foods_to_prefer: Array.from(new Set(foodsToPrefer)),
    foods_to_limit: Array.from(new Set(foodsToLimit)),
    rules_matched: activeRules.concat(manualReviewRules),
    conflicts_detected: conflictsDetected,
    consensus_matched: consensusMatched,
    lifestyle_advice: lifestyleAdvice
  };
}
