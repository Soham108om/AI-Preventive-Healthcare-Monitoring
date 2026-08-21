import React from "react";
import { Link } from "react-router-dom";
import { Activity } from "lucide-react";

/**
 * Standardized MedAI Brand Mark / Logo Component
 * 
 * Used across all pages (Login, Signup, Patient Dashboard, Doctor Dashboard,
 * Caregiver Dashboard, Diet Planner, Home, Chatbot, etc.) to guarantee 100%
 * brand mark consistency.
 */
export default function MedAILogo({
  size = "md",
  variant = "default",
  tagline = null,
  to = null,
  className = "",
}) {
  // Size-dependent mappings
  const sizeConfig = {
    xs: {
      padding: "p-1.5",
      iconSize: 14,
      strokeWidth: 2.5,
      radius: "rounded-lg",
      textSize: "text-base",
      taglineSize: "text-[9px]",
      gap: "gap-2",
    },
    sm: {
      padding: "p-2",
      iconSize: 18,
      strokeWidth: 2.5,
      radius: "rounded-xl",
      textSize: "text-lg",
      taglineSize: "text-[9px]",
      gap: "gap-2.5",
    },
    md: {
      padding: "p-2.5",
      iconSize: 22,
      strokeWidth: 2.5,
      radius: "rounded-2xl",
      textSize: "text-2xl",
      taglineSize: "text-[10px]",
      gap: "gap-3",
    },
    lg: {
      padding: "p-2.5",
      iconSize: 24,
      strokeWidth: 2.5,
      radius: "rounded-2xl",
      textSize: "text-2xl",
      taglineSize: "text-[10px]",
      gap: "gap-3",
    },
    xl: {
      padding: "p-3",
      iconSize: 28,
      strokeWidth: 2.5,
      radius: "rounded-2xl",
      textSize: "text-3xl",
      taglineSize: "text-xs",
      gap: "gap-3.5",
    },
  };

  const config = sizeConfig[size] || sizeConfig.md;

  // Text color mapping based on variant
  const textColor =
    variant === "light"
      ? "text-white"
      : variant === "dark"
      ? "text-slate-900"
      : "text-[#173B3A]";

  const taglineColor =
    variant === "light"
      ? "text-emerald-100/80"
      : "text-[#94A5A3]";

  const LogoContent = (
    <div className={`inline-flex items-center ${config.gap} ${className}`}>
      {/* Icon Badge Container */}
      <div
        className={`bg-[#007F73] ${config.padding} ${config.radius} shadow-lg shadow-[#007F73]/20 text-white flex items-center justify-center shrink-0`}
      >
        <Activity size={config.iconSize} strokeWidth={config.strokeWidth} />
      </div>

      {/* Brand Text */}
      <div className="flex flex-col justify-center">
        <span
          className={`font-outfit font-extrabold ${config.textSize} ${textColor} tracking-tight block leading-none`}
        >
          MedAI
        </span>
        {tagline && (
          <span
            className={`font-bold uppercase tracking-widest ${config.taglineSize} ${taglineColor} mt-1 block leading-none`}
          >
            {tagline}
          </span>
        )}
      </div>
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="inline-block hover:opacity-95 transition-opacity">
        {LogoContent}
      </Link>
    );
  }

  return LogoContent;
}
