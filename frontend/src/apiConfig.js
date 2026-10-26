// Centralized API configuration for MedAI web and mobile Android builds
export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"
).replace(/\/+$/, "");
