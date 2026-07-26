import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { getMyPrefs, updateMyPrefs, DEFAULT_SHORTCUTS, getSiteTheme } from "./prefs.functions";

type Prefs = {
  miniStats: boolean;
  shortcuts: Record<string, string>;
  pinnedPages: string[];
  seenTours: string[];
  themeChoice: string | null;
};

const DEFAULT_PREFS: Prefs = {
  miniStats: true,
  shortcuts: DEFAULT_SHORTCUTS,
  pinnedPages: [],
  seenTours: [],
  themeChoice: null,
};

type Ctx = {
  prefs: Prefs;
  update: (p: Partial<Prefs>) => Promise<void>;
  siteTheme: { enabled_themes: string[]; forced_theme: string | null };
  activeSeasonal: string | null;
};

const PrefsContext = createContext<Ctx | undefined>(undefined);

export function PrefsProvider({ children }: { children: React.ReactNode }) {
  const getFn = useServerFn(getMyPrefs);
  const updFn = useServerFn(updateMyPrefs);
  const siteFn = useServerFn(getSiteTheme);
  const qc = useQueryClient();
  const { data: raw } = useQuery({ queryKey: ["my-prefs"], queryFn: () => getFn(), staleTime: 30_000 });
  const { data: site } = useQuery({ queryKey: ["site-theme"], queryFn: () => siteFn(), staleTime: 30_000, refetchInterval: 60_000 });

  const prefs: Prefs = useMemo(() => {
    if (!raw) return DEFAULT_PREFS;
    const r = raw as Partial<Prefs> & { mini_stats?: boolean; pinned_pages?: string[]; seen_tours?: string[]; theme_choice?: string | null };
    return {
      miniStats: r.mini_stats ?? true,
      shortcuts: (r.shortcuts as Record<string, string>) ?? DEFAULT_SHORTCUTS,
      pinnedPages: r.pinned_pages ?? [],
      seenTours: r.seen_tours ?? [],
      themeChoice: r.theme_choice ?? null,
    };
  }, [raw]);

  const siteTheme = (site as { enabled_themes: string[]; forced_theme: string | null }) ?? { enabled_themes: [], forced_theme: null };

  const activeSeasonal = useMemo(() => {
    if (siteTheme.forced_theme) return siteTheme.forced_theme;
    if (prefs.themeChoice && siteTheme.enabled_themes.includes(prefs.themeChoice)) return prefs.themeChoice;
    return null;
  }, [siteTheme, prefs.themeChoice]);

  // Apply seasonal theme via data-attribute on html
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.setAttribute("data-seasonal", activeSeasonal ?? "");
  }, [activeSeasonal]);

  const update = useCallback(async (p: Partial<Prefs>) => {
    await updFn({ data: {
      miniStats: p.miniStats,
      shortcuts: p.shortcuts,
      pinnedPages: p.pinnedPages,
      seenTours: p.seenTours,
      themeChoice: p.themeChoice,
    } });
    qc.invalidateQueries({ queryKey: ["my-prefs"] });
  }, [updFn, qc]);

  return <PrefsContext.Provider value={{ prefs, update, siteTheme, activeSeasonal }}>{children}</PrefsContext.Provider>;
}

export function usePrefs() {
  const c = useContext(PrefsContext);
  if (!c) throw new Error("PrefsProvider missing");
  return c;
}

// Global shortcut handler
export function useShortcuts() {
  const { prefs } = usePrefs();
  const navigate = useNavigate();
  const bufferRef = useRef<string>("");
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const targets: Record<string, string> = {
      flightPlan: "/flight-plan",
      atis: "/atis",
      voice: "/voice",
      myFlights: "/my-flights",
      profile: "/profile",
      shop: "/shop",
      charts: "/charts",
      settings: "/settings",
    };

    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      // Handle single-key ?
      if (e.key === "?" && (prefs.shortcuts.cheatsheet ?? "?") === "?") {
        window.dispatchEvent(new CustomEvent("shortcuts:cheatsheet"));
        return;
      }
      const k = e.key.toLowerCase();
      if (bufferRef.current) {
        const combo = `${bufferRef.current} ${k}`;
        for (const [key, path] of Object.entries(targets)) {
          const bind = (prefs.shortcuts[key] ?? DEFAULT_SHORTCUTS[key] ?? "").toLowerCase();
          if (bind === combo) {
            navigate({ to: path });
            bufferRef.current = "";
            if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
            return;
          }
        }
        bufferRef.current = "";
        if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      } else if (k === "g") {
        bufferRef.current = "g";
        timeoutRef.current = window.setTimeout(() => { bufferRef.current = ""; }, 1500);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prefs.shortcuts, navigate]);
}

export function useToursSeen(tour: string) {
  const { prefs, update } = usePrefs();
  const seen = prefs.seenTours.includes(tour);
  const markSeen = () => {
    if (!seen) update({ seenTours: [...prefs.seenTours, tour] });
  };
  return { seen, markSeen };
}

export { DEFAULT_SHORTCUTS };
export const AVAILABLE_PAGES = [
  { key: "/", label: "Dashboard" },
  { key: "/flight-plan", label: "File Plan" },
  { key: "/my-flights", label: "My Flights" },
  { key: "/atc", label: "ATC Center" },
  { key: "/atis", label: "ATIS" },
  { key: "/voice", label: "Voice" },
  { key: "/charts", label: "Charts" },
  { key: "/ground", label: "Ground Crew" },
  { key: "/partners", label: "Partners" },
  { key: "/events", label: "Events" },
  { key: "/profile", label: "Profile" },
  { key: "/shop", label: "Shop" },
  { key: "/users", label: "Users" },
  { key: "/friends", label: "Friends" },
];
