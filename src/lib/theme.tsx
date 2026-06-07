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
    const body = document.body;
    if (partnerTheme) {
      body.style.background = partnerTheme.bg ?? "";
      body.style.color = partnerTheme.text ?? "";
      body.style.backgroundAttachment = "fixed";
      try { localStorage.setItem(PARTNER_KEY, JSON.stringify(partnerTheme)); } catch { /* ignore */ }
    } else {
      body.style.background = "";
      body.style.color = "";
      body.style.backgroundAttachment = "";
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
