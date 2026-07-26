// Lightweight WebAudio sound effects — no assets required.
let ctx: AudioContext | null = null;
let muted = false;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (muted) return null;
  if (!ctx) {
    try {
      const AC = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
      ctx = new AC();
    } catch { return null; }
  }
  if (ctx?.state === "suspended") void ctx.resume();
  return ctx;
}

export function setMuted(v: boolean) {
  muted = v;
  if (typeof localStorage !== "undefined") localStorage.setItem("sfx-muted", v ? "1" : "0");
}
export function isMuted() {
  if (typeof localStorage === "undefined") return muted;
  return localStorage.getItem("sfx-muted") === "1";
}

function tone(freq: number, dur: number, type: OscillatorType = "sine", vol = 0.08, delay = 0) {
  const c = getCtx();
  if (!c) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function sweep(f1: number, f2: number, dur: number, type: OscillatorType = "sine", vol = 0.08) {
  const c = getCtx();
  if (!c) return;
  const t = c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f1, t);
  o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export const sfx = {
  click: () => tone(600, 0.06, "square", 0.04),
  hover: () => tone(900, 0.03, "sine", 0.02),
  coin: () => { tone(880, 0.08, "triangle", 0.06); tone(1320, 0.12, "triangle", 0.06, 0.06); },
  success: () => { tone(660, 0.1, "sine", 0.07); tone(880, 0.14, "sine", 0.07, 0.08); tone(1175, 0.2, "sine", 0.07, 0.16); },
  error: () => { tone(220, 0.15, "sawtooth", 0.05); tone(180, 0.2, "sawtooth", 0.05, 0.1); },
  notify: () => sweep(700, 1100, 0.2, "sine", 0.06),
  whoosh: () => sweep(1200, 200, 0.35, "triangle", 0.05),
  pop: () => tone(520, 0.08, "triangle", 0.05),
};
