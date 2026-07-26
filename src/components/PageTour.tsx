import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Sparkles, X, ChevronRight } from "lucide-react";
import { usePrefs } from "@/lib/prefs";
import { sfx } from "@/lib/sounds";

type Step = { title: string; body: string };
type Tour = { key: string; match: (path: string) => boolean; steps: Step[] };

const TOURS: Tour[] = [
  { key: "tour:index", match: (p) => p === "/", steps: [
    { title: "Welcome to ATC365", body: "Your ops hub — file plans, run ATIS, and monitor live traffic in one place." },
    { title: "Live filters", body: "Use Today / Tomorrow / Choose date to focus the flight list." },
    { title: "Tip", body: "Press ? anywhere to see keyboard shortcuts, or g s for settings." },
  ]},
  { key: "tour:flight-plan", match: (p) => p === "/flight-plan", steps: [
    { title: "Smart defaults", body: "We prefill fields based on your recent flights — overwrite anything you like." },
    { title: "Copilot", body: "Add a copilot's Discord to share the flight in their My Flights." },
    { title: "Squawk locked", body: "Squawk starts at 1000 and can be edited from My Flights once approved." },
  ]},
  { key: "tour:atis", match: (p) => p === "/atis", steps: [
    { title: "Dual runways", body: "Enter departure & arrival runways (10 chars max each)." },
    { title: "Auto letters", body: "Re-broadcast the same ICAO with a later letter and older ones are cleared." },
  ]},
  { key: "tour:my-flights", match: (p) => p === "/my-flights", steps: [
    { title: "Edit or delete", body: "Update your plans anytime; denied plans are delete-only." },
    { title: "Update squawk", body: "After approval, set the real squawk here — emergencies auto-highlight." },
  ]},
  { key: "tour:voice", match: (p) => p === "/voice", steps: [
    { title: "Two modes", body: "Easy shows all channels with search. Hard shows only a frequency searchbar." },
    { title: "Auto-release", body: "ATC claims auto-release after 1 hour to prevent AFK controllers." },
  ]},
  { key: "tour:charts", match: (p) => p === "/charts", steps: [
    { title: "Live catalog", body: "Charts sync from aeronav.space every 30 minutes." },
    { title: "Filter", body: "Narrow by airport or chart type; click a chart to open in Drive." },
  ]},
  { key: "tour:shop", match: (p) => p === "/shop", steps: [
    { title: "Earn tokens", body: "File plans, run ATIS, and keep your login streak going." },
    { title: "Tags on Discord", body: "Equipping a tag renames you in Discord — e.g. ATC | you." },
  ]},
  { key: "tour:settings", match: (p) => p === "/settings", steps: [
    { title: "Personalize", body: "Toggle Mini Stats, pin favorite pages, remap shortcuts." },
    { title: "Seasonal themes", body: "Pick from any theme your admins have enabled." },
  ]},
  { key: "tour:owner", match: (p) => p === "/owner", steps: [
    { title: "Owner tools", body: "Manage themes, partner dashboards, shop tags, and the site banner." },
  ]},
  { key: "tour:server", match: (p) => p === "/server", steps: [
    { title: "Private server", body: "Verified ATC members get a Roblox private server link." },
  ]},
  { key: "tour:friends", match: (p) => p === "/friends", steps: [
    { title: "Friends", body: "Send requests from a user's profile — accepted friends show up here." },
  ]},
  { key: "tour:users", match: (p) => p === "/users", steps: [
    { title: "Community", body: "Search members, view their stats, and open profiles." },
  ]},
  { key: "tour:events", match: (p) => p === "/events", steps: [
    { title: "Events", body: "Browse the calendar; click a date to see what's scheduled." },
  ]},
  { key: "tour:partners", match: (p) => p === "/partners", steps: [
    { title: "Partners", body: "Open a dashboard to chat, read announcements, and re-theme the site." },
  ]},
  { key: "tour:ground", match: (p) => p === "/ground", steps: [
    { title: "Ground crew", body: "Request services from the ramp; finished jobs vanish after 10s." },
  ]},
];

export function PageTour() {
  const { prefs, update } = usePrefs();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [step, setStep] = useState(0);
  const [active, setActive] = useState<Tour | null>(null);

  useEffect(() => {
    const t = TOURS.find((t) => t.match(path));
    if (!t) { setActive(null); return; }
    if (prefs.seenTours.includes(t.key)) { setActive(null); return; }
    setStep(0);
    setActive(t);
    sfx.notify();
  }, [path, prefs.seenTours]);

  if (!active) return null;
  const s = active.steps[step];
  const last = step === active.steps.length - 1;

  const dismiss = () => {
    sfx.pop();
    update({ seenTours: [...prefs.seenTours, active.key] });
    setActive(null);
  };
  const next = () => {
    if (last) return dismiss();
    sfx.click();
    setStep((n) => n + 1);
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[70] flex justify-center px-4 sm:bottom-6">
      <div className="pointer-events-auto w-full max-w-sm rounded-xl border border-primary/30 bg-card/95 p-4 shadow-2xl backdrop-blur-md animate-slide-up-bounce">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-full bg-primary/15 text-primary animate-pulse-soft">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-semibold">{s.title}</div>
              <button onClick={dismiss} className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Dismiss">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{s.body}</p>
            <div className="mt-3 flex items-center justify-between">
              <div className="flex gap-1">
                {active.steps.map((_, i) => (
                  <span key={i} className={`h-1.5 w-4 rounded-full transition-all ${i === step ? "bg-primary" : "bg-muted"}`} />
                ))}
              </div>
              <Button size="sm" onClick={next} className="h-7 gap-1 text-xs">
                {last ? "Got it" : (<>Next <ChevronRight className="h-3 w-3" /></>)}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
