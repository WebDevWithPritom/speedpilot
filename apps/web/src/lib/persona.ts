"use client";

import { useState, useEffect } from "react";

export type Persona = "DEVELOPER" | "MARKETER" | "AGENCY" | "SAAS_TEAM";

export interface PersonaConfig {
  id: Persona;
  label: string;
  shortLabel: string;
  tagline: string;
  description: string;
  badgeColor: string;
  iconName: string;
}

export const PERSONA_CONFIGS: Record<Persona, PersonaConfig> = {
  DEVELOPER: {
    id: "DEVELOPER",
    label: "Developer & Engineer",
    shortLabel: "Developer",
    tagline: "Technical Root Causes & Code Diffs",
    description: "Inspect framework-specific AST code patches, bundle payloads, TBT/LCP telemetry, and CLI verification commands.",
    badgeColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    iconName: "Code2",
  },
  MARKETER: {
    id: "MARKETER",
    label: "Growth & Marketer",
    shortLabel: "Marketer",
    tagline: "SEO Signals & Conversion Lift",
    description: "Zero technical jargon. Track Core Web Vitals pass/fail impact on Google rankings, bounce rates, and conversion lift.",
    badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    iconName: "TrendingUp",
  },
  AGENCY: {
    id: "AGENCY",
    label: "Agency & Consultant",
    shortLabel: "Agency",
    tagline: "Client Deliverables & Billable Hours",
    description: "Executive summaries for client decks, effort vs. impact matrix, billable dev hour estimates, and proposal-ready deliverables.",
    badgeColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    iconName: "Briefcase",
  },
  SAAS_TEAM: {
    id: "SAAS_TEAM",
    label: "Product & SaaS Team",
    shortLabel: "SaaS Team",
    tagline: "User Journey & Sprint Tickets",
    description: "Identify user drop-off bottlenecks, mobile onboarding friction, and generate 1-click Jira & Linear sprint tickets.",
    badgeColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    iconName: "Users",
  },
};

const STORAGE_KEY = "sp_audience_mode";
const EVENT_NAME = "speedpilot-persona-change";

export function getStoredPersona(): Persona {
  if (typeof window === "undefined") return "DEVELOPER";
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as Persona;
    if (saved && PERSONA_CONFIGS[saved]) {
      return saved;
    }
  } catch {
    // fallback
  }
  return "DEVELOPER";
}

export function setStoredPersona(persona: Persona): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, persona);
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { persona } }));
  } catch {
    // fallback
  }
}

export function usePersona() {
  const [persona, setPersonaState] = useState<Persona>("DEVELOPER");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setPersonaState(getStoredPersona());
    setMounted(true);

    const handlePersonaChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ persona: Persona }>;
      if (customEvent.detail?.persona && PERSONA_CONFIGS[customEvent.detail.persona]) {
        setPersonaState(customEvent.detail.persona);
      } else {
        setPersonaState(getStoredPersona());
      }
    };

    window.addEventListener(EVENT_NAME, handlePersonaChange);
    window.addEventListener("storage", handlePersonaChange);

    return () => {
      window.removeEventListener(EVENT_NAME, handlePersonaChange);
      window.removeEventListener("storage", handlePersonaChange);
    };
  }, []);

  const changePersona = (newPersona: Persona) => {
    setPersonaState(newPersona);
    setStoredPersona(newPersona);
  };

  return {
    persona,
    setPersona: changePersona,
    personaConfig: PERSONA_CONFIGS[persona],
    mounted,
  };
}

