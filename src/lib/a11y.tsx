import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { setMuted } from "./sounds";

type A11yState = {
  reduceMotion: boolean;
  soundEnabled: boolean;
  setReduceMotion: (v: boolean) => void;
  setSoundEnabled: (v: boolean) => void;
};

const A11yCtx = createContext<A11yState | undefined>(undefined);

const KEY_MOTION = "a11y-reduce-motion";
const KEY_SOUND = "a11y-sound-enabled";

function readBool(key: string, fallback: boolean): boolean {
  if (typeof localStorage === "undefined") return fallback;
  const v = localStorage.getItem(key);
  if (v === null) return fallback;
  return v === "1";
}

export function A11yProvider({ children }: { children: React.ReactNode }) {
  // SSR-safe defaults; hydrate from localStorage + system preference on mount.
  const [reduceMotion, setReduceMotionState] = useState(false);
  const [soundEnabled, setSoundEnabledState] = useState(true);

  useEffect(() => {
    const systemPref =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const rm = readBool(KEY_MOTION, !!systemPref);
    const sn = readBool(KEY_SOUND, true);
    setReduceMotionState(rm);
    setSoundEnabledState(sn);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.setAttribute("data-reduce-motion", reduceMotion ? "on" : "off");
  }, [reduceMotion]);

  useEffect(() => {
    setMuted(!soundEnabled);
  }, [soundEnabled]);

  // React to OS-level changes
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => {
      if (localStorage.getItem(KEY_MOTION) === null) setReduceMotionState(mq.matches);
    };
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  const setReduceMotion = useCallback((v: boolean) => {
    localStorage.setItem(KEY_MOTION, v ? "1" : "0");
    setReduceMotionState(v);
  }, []);
  const setSoundEnabled = useCallback((v: boolean) => {
    localStorage.setItem(KEY_SOUND, v ? "1" : "0");
    setSoundEnabledState(v);
  }, []);

  return (
    <A11yCtx.Provider value={{ reduceMotion, soundEnabled, setReduceMotion, setSoundEnabled }}>
      {children}
    </A11yCtx.Provider>
  );
}

export function useA11y() {
  const c = useContext(A11yCtx);
  if (!c) throw new Error("A11yProvider missing");
  return c;
}
