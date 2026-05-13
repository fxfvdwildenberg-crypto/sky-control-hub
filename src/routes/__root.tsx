import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { FlightStoreProvider } from "@/lib/flight-store";
import { ThemeProvider } from "@/lib/theme";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Off the radar</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This flight path doesn't exist. Return to base.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Return to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Signal lost</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Reconnect
          </button>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "ATC365 — Smooth operations" },
      { name: "description", content: "Modern ATC dashboard for flight plans, ATIS, and live traffic monitoring." },
      { name: "theme-color", content: "#0d1622" },
      { property: "og:title", content: "ATC365 — Smooth operations" },
      { property: "og:description", content: "Modern ATC dashboard for flight plans, ATIS, and live traffic monitoring." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "ATC365 — Smooth operations" },
      { name: "twitter:description", content: "Modern ATC dashboard for flight plans, ATIS, and live traffic monitoring." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/d029ab2f-fc63-4944-9c6d-5ed4babc42e4/id-preview-7fda8379--b5e3ec4a-3b89-4570-8f36-44e762055841.lovable.app-1778563103913.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/d029ab2f-fc63-4944-9c6d-5ed4babc42e4/id-preview-7fda8379--b5e3ec4a-3b89-4570-8f36-44e762055841.lovable.app-1778563103913.png" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="bg-background text-foreground antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <FlightStoreProvider>
          <SidebarProvider>
            <div className="flex min-h-screen w-full bg-background">
              <AppSidebar />
              <div className="flex flex-1 flex-col">
                <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur">
                  <SidebarTrigger />
                  <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-status-landed animate-pulse" />
                    Live · ATC Network
                  </div>
                  <div className="ml-auto flex items-center gap-3 text-xs font-mono text-muted-foreground">
                    <LiveClock />
                    <ThemeToggle />
                  </div>
                </header>
                <main className="flex-1">
                  <Outlet />
                </main>
              </div>
            </div>
            <Toaster />
          </SidebarProvider>
        </FlightStoreProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function LiveClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const z = now.toISOString().slice(11, 19);
  return <span>{z} <span className="text-primary">Z</span></span>;
}

