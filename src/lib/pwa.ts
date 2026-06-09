// Guarded service worker registration. Only registers in production builds
// and skips Lovable preview/iframe/dev contexts. Supports ?sw=off kill switch.

const SW_URL = "/sw.js";

function isUnsafeHost(hostname: string) {
  return (
    hostname.startsWith("id-preview--") ||
    hostname.startsWith("preview--") ||
    hostname === "lovableproject.com" ||
    hostname.endsWith(".lovableproject.com") ||
    hostname === "lovableproject-dev.com" ||
    hostname.endsWith(".lovableproject-dev.com") ||
    hostname === "beta.lovable.dev" ||
    hostname.endsWith(".beta.lovable.dev")
  );
}

async function unregisterMatching() {
  if (!("serviceWorker" in navigator)) return;
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    regs
      .filter((r) => {
        const url = r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || "";
        return url.endsWith(SW_URL);
      })
      .map((r) => r.unregister()),
  );
}

export async function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  if (!import.meta.env.PROD) return;

  const inIframe = window.self !== window.top;
  const killSwitch = new URLSearchParams(window.location.search).get("sw") === "off";
  if (inIframe || isUnsafeHost(window.location.hostname) || killSwitch) {
    await unregisterMatching();
    return;
  }

  try {
    await navigator.serviceWorker.register(SW_URL, { scope: "/" });
  } catch (err) {
    console.warn("SW registration failed", err);
  }
}
