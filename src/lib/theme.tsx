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
    if (partnerTheme) {
      const bg = partnerTheme.bg ?? "#ffffff";
      const text = partnerTheme.text ?? "#0a0a0a";
      const primary = partnerTheme.primary ?? bg;
      const accent = partnerTheme.accent ?? primary;
      const mix = (c1: string, c2: string, pct: number) => `color-mix(in srgb, ${c1} ${pct}%, ${c2})`;
      const card = mix(bg, "white", 75);
      const muted = mix(bg, "white", 60);
      const border = mix(bg, "black", 70);
      const sidebarBg = mix(bg, "black", 65);
      const setv = (k: string, v: string) => root.style.setProperty(k, v);
      setv("--background", bg);
      setv("--foreground", text);
      setv("--card", card);
      setv("--card-foreground", text);
      setv("--popover", card);
      setv("--popover-foreground", text);
      setv("--primary", primary);
      setv("--primary-foreground", text);
      setv("--secondary", muted);
      setv("--secondary-foreground", text);
      setv("--muted", muted);
      setv("--muted-foreground", mix(text, bg, 65));
      setv("--accent", accent);
      setv("--accent-foreground", text);
      setv("--border", border);
      setv("--input", muted);
      setv("--ring", primary);
      setv("--sidebar", sidebarBg);
      setv("--sidebar-foreground", "#ffffff");
      setv("--sidebar-primary", primary);
      setv("--sidebar-primary-foreground", text);
      setv("--sidebar-accent", mix(sidebarBg, "white", 80));
      setv("--sidebar-accent-foreground", "#ffffff");
      setv("--sidebar-border", mix(sidebarBg, "white", 75));
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
