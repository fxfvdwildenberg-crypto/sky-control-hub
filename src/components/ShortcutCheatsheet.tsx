import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePrefs, DEFAULT_SHORTCUTS } from "@/lib/prefs";
import { Link } from "@tanstack/react-router";

const LABELS: Record<string, string> = {
  flightPlan: "File Plan",
  atis: "ATIS",
  voice: "Voice",
  myFlights: "My Flights",
  profile: "Profile",
  shop: "Shop",
  charts: "Charts",
  settings: "Settings",
  cheatsheet: "Show this cheatsheet",
};

export function ShortcutCheatsheet() {
  const [open, setOpen] = useState(false);
  const { prefs } = usePrefs();
  useEffect(() => {
    const h = () => setOpen(true);
    window.addEventListener("shortcuts:cheatsheet", h);
    return () => window.removeEventListener("shortcuts:cheatsheet", h);
  }, []);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Keyboard shortcuts</DialogTitle></DialogHeader>
        <div className="space-y-1 text-sm">
          {Object.keys(LABELS).map((k) => (
            <div key={k} className="flex items-center justify-between border-b py-1.5 last:border-0">
              <span>{LABELS[k]}</span>
              <kbd className="rounded bg-muted px-2 py-0.5 font-mono text-xs">{prefs.shortcuts[k] ?? DEFAULT_SHORTCUTS[k]}</kbd>
            </div>
          ))}
        </div>
        <div className="text-xs text-muted-foreground">Change these in <Link to="/settings" className="text-primary underline" onClick={() => setOpen(false)}>Settings</Link>.</div>
      </DialogContent>
    </Dialog>
  );
}
