/**
 * Helper utilities for clinical nutrition calculations and conversions.
 */

/**
 * Calculates standard BMI categories.
 */
export function getBmiCategory(bmi: number): string {
  if (bmi < 18.5) return "underweight";
  if (bmi >= 30) return "obese";
  if (bmi >= 25) return "overweight";
  return "normal";
}

/**
 * Maps step count thresholds to active level descriptions.
 */
export function getStepActivityDescription(steps: number): string {
  if (steps > 12000) return "Athletic/Very High Activity";
  if (steps >= 8000) return "Active/Moderate Activity";
  if (steps >= 5000) return "Lightly Active";
  return "Sedentary/Low Activity";
}

/**
 * Returns readable evidence strength descriptions.
 */
export function formatEvidenceLevel(level: string): string {
  switch (level.toUpperCase()) {
    case "HIGH":
      return "High Evidence (Level A / Strong)";
    case "MODERATE":
      return "Moderate Evidence (Level B / Medium)";
    case "LOW-MODERATE":
    case "LOW":
      return "Low Evidence (Level C / Weak)";
    default:
      return level;
  }
}
