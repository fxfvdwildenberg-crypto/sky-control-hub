import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";
export type PartnerTheme = {
  slug: string;
  name: string;
  bg?: string;
  text?: string;
  primary?: string;
  accent?: string;
} | null;

type Ctx = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
  partnerTheme: PartnerTheme;
  applyPartnerTheme: (p: PartnerTheme) => void;
};

const ThemeContext = createContext<Ctx | undefined>(undefined);
const STORAGE_KEY = "atc365-theme";
const PARTNER_KEY = "atc365-partner-theme";

// Parse #rgb / #rrggbb to {r,g,b}, default to white if invalid
function parseColor(c: string): { r: number; g: number; b: number } {
  let s = c.trim().replace("#", "");
  if (s.length === 3) s = s.split("").map((x) => x + x).join("");
  if (s.length !== 6) return { r: 255, g: 255, b: 255 };
  return {
    r: parseInt(s.slice(0, 2), 16),
    g: parseInt(s.slice(2, 4), 16),
    b: parseInt(s.slice(4, 6), 16),
  };
}
// Relative luminance (0–1)
function luminance(c: string) {
  const { r, g, b } = parseColor(c);
  const norm = [r, g, b].map((v) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * norm[0] + 0.7152 * norm[1] + 0.0722 * norm[2];
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [partnerTheme, setPartnerTheme] = useState<PartnerTheme>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (stored === "light" || stored === "dark") setThemeState(stored);
    try {
      const p = localStorage.getItem(PARTNER_KEY);
      if (p) setPartnerTheme(JSON.parse(p));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* ignore */ }
  }, [theme]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const vars = [
      "--background", "--foreground", "--card", "--card-foreground",
      "--popover", "--popover-foreground", "--primary", "--primary-foreground",
      "--secondary", "--secondary-foreground", "--muted", "--muted-foreground",
      "--accent", "--accent-foreground", "--border", "--input", "--ring",
      "--sidebar", "--sidebar-foreground", "--sidebar-primary",
      "--sidebar-primary-foreground", "--sidebar-accent", "--sidebar-accent-foreground",
      "--sidebar-border", "--sidebar-ring",
    ];
    if (partnerTheme && partnerTheme.bg) {
      const bg = partnerTheme.bg;
      const lum = luminance(bg);
      const isDarkBg = lum < 0.5;
      // Foreground auto-contrasts the airline bg
      const fg = isDarkBg ? "#ffffff" : "#0a0a0a";
      const primary = partnerTheme.primary ?? bg;
      const accent = partnerTheme.accent ?? primary;
      // primary text picks contrast against primary color
      const primaryFg = luminance(primary) < 0.5 ? "#ffffff" : "#0a0a0a";
      const accentFg = luminance(accent) < 0.5 ? "#ffffff" : "#0a0a0a";
      // Card/muted/border lift away from the bg by mixing with the opposite color
      const lift = isDarkBg ? "white" : "black";
      const mix = (pct: number) => `color-mix(in srgb, ${bg} ${100 - pct}%, ${lift})`;
      const card = mix(8);
      const muted = mix(14);
      const border = mix(22);
      const sidebarBg = isDarkBg ? mix(10) : `color-mix(in srgb, ${bg} 50%, black)`;
      const setv = (k: string, v: string) => root.style.setProperty(k, v);
      setv("--background", bg);
      setv("--foreground", fg);
      setv("--card", card);
      setv("--card-foreground", fg);
      setv("--popover", card);
      setv("--popover-foreground", fg);
      setv("--primary", primary);
      setv("--primary-foreground", primaryFg);
      setv("--secondary", muted);
      setv("--secondary-foreground", fg);
      setv("--muted", muted);
      setv("--muted-foreground", isDarkBg ? "#cbd5e1" : "#475569");
      setv("--accent", accent);
      setv("--accent-foreground", accentFg);
      setv("--border", border);
      setv("--input", muted);
      setv("--ring", primary);
      setv("--sidebar", sidebarBg);
      setv("--sidebar-foreground", "#ffffff");
      setv("--sidebar-primary", primary);
      setv("--sidebar-primary-foreground", primaryFg);
      setv("--sidebar-accent", `color-mix(in srgb, ${sidebarBg} 80%, white)`);
      setv("--sidebar-accent-foreground", "#ffffff");
      setv("--sidebar-border", `color-mix(in srgb, ${sidebarBg} 75%, white)`);
      setv("--sidebar-ring", primary);
      try { localStorage.setItem(PARTNER_KEY, JSON.stringify(partnerTheme)); } catch { /* ignore */ }
    } else {
      vars.forEach((v) => root.style.removeProperty(v));
      try { localStorage.removeItem(PARTNER_KEY); } catch { /* ignore */ }
    }
  }, [partnerTheme]);


  return (
    <ThemeContext.Provider value={{
      theme,
      setTheme: setThemeState,
      toggle: () => setThemeState((p) => (p === "dark" ? "light" : "dark")),
      partnerTheme,
      applyPartnerTheme: setPartnerTheme,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
