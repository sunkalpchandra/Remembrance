// Comfort text scaling: bumps the root font size so every rem-based
// Tailwind size grows together. Persisted per browser; applied before
// hydration by the inline snippet in app/layout.tsx.
export type TextScale = "default" | "large" | "xlarge";

export const TEXT_SCALES: { id: TextScale; label: string; px: number }[] = [
  { id: "default", label: "Default", px: 16 },
  { id: "large", label: "Large", px: 18.4 },
  { id: "xlarge", label: "Extra large", px: 20.8 },
];

const STORAGE_KEY = "text-scale";

export function getTextScale(): TextScale {
  if (typeof window === "undefined") return "default";
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "large" || v === "xlarge") return v;
  } catch {}
  return "default";
}

export function applyTextScale(scale: TextScale) {
  const entry = TEXT_SCALES.find((s) => s.id === scale) ?? TEXT_SCALES[0];
  document.documentElement.style.fontSize =
    scale === "default" ? "" : `${entry.px}px`;
  try {
    localStorage.setItem(STORAGE_KEY, scale);
  } catch {}
}

// Kept in sync with applyTextScale — inlined into <head> so the scale
// lands before first paint.
export const TEXT_SCALE_BOOT_SCRIPT = `try{var s=localStorage.getItem("${STORAGE_KEY}");if(s==="large")document.documentElement.style.fontSize="18.4px";else if(s==="xlarge")document.documentElement.style.fontSize="20.8px";}catch(e){}`;
