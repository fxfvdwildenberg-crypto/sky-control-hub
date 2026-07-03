import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Megaphone } from "lucide-react";
import { getSiteBanner } from "@/lib/site.functions";

export function SiteBanner() {
  const fn = useServerFn(getSiteBanner);
  const { data } = useQuery({ queryKey: ["site-banner"], queryFn: () => fn(), refetchInterval: 20000 });
  const msg = data?.message?.trim();
  if (!msg) return null;
  return (
    <div className="flex items-center justify-center gap-2 bg-gradient-to-r from-primary/90 via-primary to-primary/90 px-4 py-1.5 text-center text-xs font-medium text-primary-foreground shadow-sm">
      <Megaphone className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{msg}</span>
    </div>
  );
}
