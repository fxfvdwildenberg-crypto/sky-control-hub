import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Coins, ShoppingBag } from "lucide-react";
import { buyTag, SHOP_TAGS } from "@/lib/profile.functions";
import { listShopTags } from "@/lib/prefs.functions";
import { useMyProfile } from "@/lib/use-my-profile";

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "Shop — ATC365" },
      { name: "description", content: "Spend your ATC365 tokens on profile tags." },
    ],
  }),
  component: ShopPage,
});

function ShopPage() {
  const { data: profile } = useMyProfile();
  const buyFn = useServerFn(buyTag);
  const listFn = useServerFn(listShopTags);
  const qc = useQueryClient();
  const { data: dbTags = [] } = useQuery({ queryKey: ["shop-tags"], queryFn: () => listFn(), staleTime: 30_000 });
  const items = dbTags.length ? dbTags.map((t) => ({ tag: t.tag, cost: t.cost })) : SHOP_TAGS;

  const buyMut = useMutation({
    mutationFn: (tag: string) => buyFn({ data: { tag } }),
    onSuccess: (_r, tag) => { qc.invalidateQueries({ queryKey: ["my-profile"] }); toast.success(`Unlocked "${tag}" 🎉`); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 md:px-8">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-md bg-primary/15 flex items-center justify-center text-primary">
          <ShoppingBag className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Tag shop</h1>
          <p className="text-sm text-muted-foreground">Show off your style. Equip tags from your profile.</p>
        </div>
        <div className="ml-auto flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-mono">
          <Coins className="h-4 w-4 text-primary" />
          {profile?.tokens ?? 0}
        </div>
      </div>

      {!profile && (
        <Card><CardContent className="p-6 text-sm">
          <Link to="/login" className="text-primary underline">Sign in</Link> to buy tags.
        </CardContent></Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const owned = profile?.ownedTags.includes(item.tag);
          const canAfford = (profile?.tokens ?? 0) >= item.cost;
          return (
            <Card key={item.tag} className="transition hover:shadow-lg hover:-translate-y-0.5">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{item.tag}</span>
                  <Badge variant="outline" className="font-mono">{item.cost} <Coins className="h-3 w-3 ml-1" /></Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  disabled={!profile || owned || !canAfford || buyMut.isPending}
                  onClick={() => buyMut.mutate(item.tag)}
                  className="w-full"
                >
                  {owned ? "Owned ✓" : canAfford ? "Buy" : "Not enough tokens"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
