import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listPartners } from "@/lib/partners.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Handshake, ArrowRight, Loader2 } from "lucide-react";

export const Route = createFileRoute("/partners/")({
  component: PartnersPage,
  head: () => ({
    meta: [
      { title: "ATC365 Airlines" },
      { name: "description", content: "Partnered virtual airlines on the ATC365 network." },
    ],
  }),
});

function PartnersPage() {
  const fn = useServerFn(listPartners);
  const { data, isLoading } = useQuery({ queryKey: ["partners"], queryFn: () => fn() });

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Handshake className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold">ATC365 Airlines</h1>
          <p className="text-sm text-muted-foreground">Partnered virtual airlines on ATC365.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading partners…
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {data?.map((p) => {
            const theme = (p.theme ?? {}) as { bg?: string; text?: string; primary?: string };
            return (
              <Card
                key={p.id}
                className="overflow-hidden border-border"
                style={{ background: theme.bg, color: theme.text }}
              >
                <div className="p-5">
                  <h2 className="text-lg font-semibold">{p.name}</h2>
                  <p className="mt-1 text-sm opacity-90 line-clamp-3">{p.bio || "—"}</p>
                  <div className="mt-4 flex gap-2">
                    <Link to="/$slug" params={{ slug: p.slug }}>
                      <Button size="sm" variant="secondary" className="gap-2">
                        Join Dashboard <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                    {p.discord_url && (
                      <a href={p.discord_url} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="outline">Discord</Button>
                      </a>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
