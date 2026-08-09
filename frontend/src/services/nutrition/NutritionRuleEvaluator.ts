import { EvaluationContext } from "./NutritionTypes";

/**
 * Safely resolves nested property paths (e.g. "user.activity_level") from a context object.
 */
function getPropertyValue(obj: any, path: string): any {
  return path.split(".").reduce((acc, part) => {
    if (acc === null || acc === undefined) return undefined;
    return acc[part];
  }, obj);
}

/**
 * Parses a string list representation like "['T2D','prediabetes']" into a Javascript array.
 */
function parseStringList(listStr: string): string[] {
  const clean = listStr.trim().replace(/^\[|\]$/g, "");
  return clean.split(",").map(item => item.trim().replace(/^['"]|['"]$/g, ""));
}

/**
 * Evaluates a single comparison token against the context.
 */
function evaluateSingleExpression(expr: string, context: EvaluationContext): boolean {
  const trimmed = expr.trim();

  // Simple direct truthy flags
  if (trimmed === "always_applicable") return true;
  if (trimmed === "reducing_free_sugar_intake") return context.reducing_free_sugar_intake;
  if (trimmed === "sodium_reduction_goal == true") return context.sodium_reduction_goal;
  if (trimmed === "meal_planning == true") return context.meal_planning;
  if (trimmed === "fat_consumption == true") return context.fat_consumption;
  if (trimmed === "post_exercise == true") return context.post_exercise;
  if (trimmed === "pre_exercise_meal_planning == true") return context.pre_exercise_meal_planning;
  if (trimmed === "during_exercise == true") return context.during_exercise;
  if (trimmed === "protein_dosing_recommendation == true") return context.protein_dosing_recommendation;
  if (trimmed === "daily_protein_planning == true") return context.daily_protein_planning;

  // 1. Evaluate "between ... and ..." expressions (e.g., "age_years between 2 and 5")
  const betweenMatch = trimmed.match(/^([\w.]+)\s+between\s+(\d+)\s+and\s+(\d+)$/i);
  if (betweenMatch) {
    const [_, variable, startStr, endStr] = betweenMatch;
    const value = getPropertyValue(context, variable);
    const start = parseFloat(startStr);
    const end = parseFloat(endStr);
    if (typeof value === "number") {
      return value >= start && value <= end;
    }
    return false;
  }

  // 2. Evaluate "IN" array expressions (e.g., "user.condition IN ['T2D','prediabetes']")
  const inMatch = trimmed.match(/^([\w.]+)\s+IN\s+(\[.+\])$/i);
  if (inMatch) {
    const [_, variable, listStr] = inMatch;
    const value = getPropertyValue(context, variable);
    const list = parseStringList(listStr);

    if (Array.isArray(value)) {
      // If the context value is an array of conditions, check if any of them are in our comparison list
      return value.some(val => list.includes(val));
    }
    if (typeof value === "string") {
      return list.includes(value);
    }
    return false;
  }

  // 3. Evaluate standard comparisons (==, !=, >=, <=, >, <)
  const compMatch = trimmed.match(/^([\w.]+)\s*(==|!=|>=|<=|>|<)\s*(.+)$/);
  if (compMatch) {
    const [_, variable, operator, valueStr] = compMatch;
    const rawVal = getPropertyValue(context, variable);
    
    // Parse the comparison value
    let compareVal: any = valueStr.trim().replace(/^['"]|['"]$/g, "");
    if (compareVal === "true") compareVal = true;
    else if (compareVal === "false") compareVal = false;
    else if (compareVal === "null") compareVal = null;
    else if (!isNaN(Number(compareVal))) compareVal = Number(compareVal);

    if (rawVal === undefined) return false;

    switch (operator) {
      case "==":
        return rawVal === compareVal;
      case "!=":
        return rawVal !== compareVal;
      case ">=":
        return Number(rawVal) >= Number(compareVal);
      case "<=":
        return Number(rawVal) <= Number(compareVal);
      case ">":
        return Number(rawVal) > Number(compareVal);
      case "<":
        return Number(rawVal) < Number(compareVal);
      default:
        return false;
    }
  }

  console.warn("⚠️ Unrecognized clinical trigger expression:", trimmed);
  return false;
}

/**
 * Core dynamic evaluator. Splits triggers recursively by OR and AND, enforcing clinical operator precedence.
 */
export function evaluateTrigger(trigger: string, context: EvaluationContext): boolean {
  if (!trigger || !trigger.trim()) return false;
  
  // Handle OR clauses (lowest precedence)
  if (trigger.includes(" OR ")) {
    const clauses = trigger.split(" OR ");
    return clauses.some(clause => evaluateTrigger(clause, context));
  }

  // Handle AND clauses (higher precedence)
  if (trigger.includes(" AND ")) {
    const clauses = trigger.split(" AND ");
    return clauses.every(clause => evaluateTrigger(clause, context));
  }

  return evaluateSingleExpression(trigger, context);
}
