import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function InstallAppButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true);
      return;
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  const handleClick = async () => {
    if (deferred) {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === "accepted") setInstalled(true);
      setDeferred(null);
    } else {
      setShowHelp(true);
    }
  };

  return (
    <>
      <Button
        size="sm"
        variant="secondary"
        onClick={handleClick}
        className="gap-1.5"
      >
        <Download className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Download the ATC365 app</span>
        <span className="sm:hidden">Install</span>
      </Button>
      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Install the ATC365 app</DialogTitle>
            <DialogDescription>
              You can use ATC365 like a native app on your device.
            </DialogDescription>
          </DialogHeader>
          {isIOS() ? (
            <ol className="space-y-2 text-sm text-muted-foreground list-decimal pl-5">
              <li>Open this page in Safari.</li>
              <li>Tap the Share button at the bottom.</li>
              <li>Choose "Add to Home Screen".</li>
              <li>Tap "Add" — ATC365 will appear on your home screen.</li>
            </ol>
          ) : (
            <ol className="space-y-2 text-sm text-muted-foreground list-decimal pl-5">
              <li>Open the browser menu (⋮).</li>
              <li>Tap "Install app" or "Add to Home screen".</li>
              <li>Confirm — ATC365 will open like a native app.</li>
            </ol>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
