import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePrefs, DEFAULT_SHORTCUTS, AVAILABLE_PAGES } from "@/lib/prefs";
import { useA11y } from "@/lib/a11y";
import { Settings as SettingsIcon, Pin, X, Accessibility } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — ATC365" }, { name: "description", content: "Personalize your ATC365 experience." }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { prefs, update, siteTheme, activeSeasonal } = usePrefs();
  const { reduceMotion, soundEnabled, setReduceMotion, setSoundEnabled } = useA11y();
  const [shortcuts, setShortcuts] = useState(prefs.shortcuts);
  useEffect(() => setShortcuts(prefs.shortcuts), [prefs.shortcuts]);
  const [newPin, setNewPin] = useState("/");

  const saveShortcuts = async () => { await update({ shortcuts }); toast.success("Shortcuts saved"); };
  const togglePin = async (path: string) => {
    const pinned = prefs.pinnedPages.includes(path)
      ? prefs.pinnedPages.filter((p) => p !== path)
      : [...prefs.pinnedPages, path];
    await update({ pinnedPages: pinned });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <header className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/15 text-primary"><SettingsIcon className="h-5 w-5" /></div>
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground">Personalize your experience.</p>
        </div>
      </header>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Accessibility className="h-4 w-4" /> Accessibility</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium">Reduce motion</div>
              <div className="text-xs text-muted-foreground">Disable non-essential animations and transitions. Defaults to your system preference.</div>
            </div>
            <Switch checked={reduceMotion} onCheckedChange={setReduceMotion} aria-label="Toggle reduced motion" />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium">Sound effects</div>
              <div className="text-xs text-muted-foreground">Play subtle audio cues for clicks, rewards, and notifications.</div>
            </div>
            <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} aria-label="Toggle sound effects" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Mini stats panel</CardTitle></CardHeader>
        <CardContent className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">Show a floating panel with tokens, tier, and active flights.</div>
          <Switch checked={prefs.miniStats} onCheckedChange={(v) => update({ miniStats: v })} />
        </CardContent>
      </Card>

      {siteTheme.enabled_themes.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Seasonal theme</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {siteTheme.forced_theme ? (
              <div className="text-sm">
                <Badge className="mr-2">Forced by owner</Badge>
                {siteTheme.forced_theme}
              </div>
            ) : (
              <Select value={prefs.themeChoice ?? "none"} onValueChange={(v) => update({ themeChoice: v === "none" ? null : v })}>
                <SelectTrigger className="w-60"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Default</SelectItem>
                  {siteTheme.enabled_themes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <div className="text-xs text-muted-foreground">Active: {activeSeasonal ?? "none"}</div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Keyboard shortcuts</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">Type <kbd className="rounded bg-muted px-1">?</kbd> anywhere to see the cheatsheet. Two-key sequences like <kbd className="rounded bg-muted px-1">g f</kbd> work outside inputs.</p>
          {Object.keys(DEFAULT_SHORTCUTS).map((k) => (
            <div key={k} className="flex items-center gap-2">
              <Label className="w-32 text-xs uppercase tracking-wider text-muted-foreground">{k}</Label>
              <Input value={shortcuts[k] ?? DEFAULT_SHORTCUTS[k]} onChange={(e) => setShortcuts({ ...shortcuts, [k]: e.target.value })} className="max-w-[120px] font-mono" />
            </div>
          ))}
          <Button size="sm" onClick={saveShortcuts}>Save shortcuts</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Pin className="h-4 w-4" /> Pinned pages</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-1">
            {prefs.pinnedPages.length === 0 && <p className="text-sm text-muted-foreground">Pin your most-used pages for one-click access from the sidebar.</p>}
            {prefs.pinnedPages.map((p) => (
              <Badge key={p} className="gap-1" variant="secondary">
                {AVAILABLE_PAGES.find((a) => a.key === p)?.label ?? p}
                <button onClick={() => togglePin(p)}><X className="h-3 w-3" /></button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Select value={newPin} onValueChange={setNewPin}>
              <SelectTrigger className="w-60"><SelectValue /></SelectTrigger>
              <SelectContent>
                {AVAILABLE_PAGES.filter((p) => !prefs.pinnedPages.includes(p.key)).map((p) => (
                  <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={() => togglePin(newPin)}>Pin</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
