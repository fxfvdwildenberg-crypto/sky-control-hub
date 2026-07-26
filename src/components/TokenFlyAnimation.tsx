import { useEffect, useState } from "react";
import { sfx } from "@/lib/sounds";

type Fly = { id: number; amount: number; x: number; y: number };

export function TokenFlyAnimation() {
  const [items, setItems] = useState<Fly[]>([]);
  useEffect(() => {
    let n = 0;
    const handler = (e: Event) => {
      const ev = e as CustomEvent<{ amount: number; x?: number; y?: number }>;
      const id = ++n;
      const x = ev.detail.x ?? window.innerWidth / 2;
      const y = ev.detail.y ?? window.innerHeight / 2;
      setItems((v) => [...v, { id, amount: ev.detail.amount, x, y }]);
      sfx.coin();
      window.setTimeout(() => setItems((v) => v.filter((i) => i.id !== id)), 1400);
    };
    window.addEventListener("tokens-earned", handler);
    return () => window.removeEventListener("tokens-earned", handler);
  }, []);
  return (
    <div className="pointer-events-none fixed inset-0 z-[60]">
      {items.map((i) => (
        <div key={i.id}
          className="absolute font-mono text-sm font-bold text-amber-400 animate-fly-up"
          style={{ left: i.x, top: i.y, textShadow: "0 0 8px rgba(250,204,21,0.6)" }}>
          +{i.amount} 🪙
        </div>
      ))}
    </div>
  );
}
