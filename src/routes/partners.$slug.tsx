import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  getPartner,
  postAnnouncement,
  deleteAnnouncement,
  updatePartnerProfile,
  postPartnerMessage,
} from "@/lib/partners.functions";
import { useCurrentUser } from "@/lib/use-current-user";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  ArrowLeft,
  Megaphone,
  MessageSquare,
  Settings,
  Send,
  Trash2,
  KeyRound,
  Loader2,
  ExternalLink,
  Info,
  Palette,
} from "lucide-react";

export const Route = createFileRoute("/partners/$slug")({
  component: PartnerDashboard,
});

function PartnerDashboard() {
  const { slug } = Route.useParams();
  const fn = useServerFn(getPartner);
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();
  const { partnerTheme, applyPartnerTheme } = useTheme();
  const { data, isLoading, error } = useQuery({
    queryKey: ["partner", slug],
    queryFn: () => fn({ data: { slug } }),
    refetchInterval: 5000,
  });

  const [code, setCode] = useState("");
  const [annText, setAnnText] = useState("");
  const [chatText, setChatText] = useState("");
  const [bio, setBio] = useState("");
  const [discordUrl, setDiscordUrl] = useState("");

  const postAnnFn = useServerFn(postAnnouncement);
  const delAnnFn = useServerFn(deleteAnnouncement);
  const updFn = useServerFn(updatePartnerProfile);
  const postMsgFn = useServerFn(postPartnerMessage);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading dashboard…
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-10 text-center">
        <p className="text-destructive">Couldn't load this partner dashboard.</p>
        <p className="mt-2 text-xs text-muted-foreground">{(error as Error)?.message}</p>
        <Link to="/partners">
          <Button variant="outline" className="mt-4">Back to partners</Button>
        </Link>
      </div>
    );
  }

  const { partner, announcements, messages } = data;
  const theme = (partner.theme ?? {}) as {
    bg?: string;
    text?: string;
    primary?: string;
    accent?: string;
  };

  const submitAnn = async () => {
    if (!code.trim() || !annText.trim()) return;
    try {
      await postAnnFn({ data: { slug, code, content: annText } });
      setAnnText("");
      toast.success("Announcement posted");
      qc.invalidateQueries({ queryKey: ["partner", slug] });
    } catch (e) { toast.error((e as Error).message); }
  };
  const removeAnn = async (id: string) => {
    if (!code.trim()) return toast.error("Enter owner code first");
    try {
      await delAnnFn({ data: { slug, code, id } });
      qc.invalidateQueries({ queryKey: ["partner", slug] });
    } catch (e) { toast.error((e as Error).message); }
  };
  const saveProfile = async () => {
    if (!code.trim()) return toast.error("Enter owner code first");
    try {
      await updFn({
        data: {
          slug,
          code,
          bio: bio !== "" ? bio : partner.bio,
          discord_url: discordUrl !== "" ? discordUrl : partner.discord_url,
        },
      });
      toast.success("Profile updated");
      setBio(""); setDiscordUrl("");
      qc.invalidateQueries({ queryKey: ["partner", slug] });
    } catch (e) { toast.error((e as Error).message); }
  };
  const sendMsg = async () => {
    if (!chatText.trim()) return;
    if (!user) return toast.error("Sign in with Discord to chat");
    try {
      await postMsgFn({ data: { slug, content: chatText } });
      setChatText("");
      qc.invalidateQueries({ queryKey: ["partner", slug] });
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div
      className="min-h-screen"
      style={{ background: theme.bg ?? undefined, color: theme.text ?? undefined }}
    >
      <div className="container mx-auto max-w-5xl px-4 py-6">
        {/* Top bar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
          <Link to="/partners">
            <Button size="sm" variant="secondary" className="gap-2">
              <ArrowLeft className="h-3.5 w-3.5" /> All partners
            </Button>
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            {partnerTheme?.slug === partner.slug ? (
              <Button size="sm" variant="outline" className="gap-2" onClick={() => applyPartnerTheme(null)}>
                <Palette className="h-3.5 w-3.5" /> Reset site theme
              </Button>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                className="gap-2"
                onClick={() => applyPartnerTheme({
                  slug: partner.slug, name: partner.name,
                  bg: theme.bg, text: theme.text, primary: theme.primary, accent: theme.accent,
                })}
              >
                <Palette className="h-3.5 w-3.5" /> Apply theme site-wide
              </Button>
            )}
            {partner.discord_url ? (
              <a href={partner.discord_url} target="_blank" rel="noreferrer">
                <Button size="sm" className="gap-2" style={{ background: theme.primary, color: theme.text }}>
                  <ExternalLink className="h-3.5 w-3.5" /> Join Discord server
                </Button>
              </a>
            ) : (
              <Badge variant="outline" className="border-white/30 text-current">No Discord link set</Badge>
            )}
          </div>
        </div>

        {/* Hero / Bio */}
        <Card
          className="mb-6 border-white/10 bg-black/25 p-6 backdrop-blur"
          style={{ color: theme.text }}
        >
          <h1 className="text-3xl font-bold tracking-tight">{partner.name}</h1>
          <div className="mt-2 flex items-start gap-2 opacity-95">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="whitespace-pre-wrap">
              {partner.bio || "No bio yet. The owner can add one below."}
            </p>
          </div>
        </Card>

        <Tabs defaultValue="announcements" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="announcements" className="gap-2">
              <Megaphone className="h-3.5 w-3.5" /> Announcements
            </TabsTrigger>
            <TabsTrigger value="chat" className="gap-2">
              <MessageSquare className="h-3.5 w-3.5" /> Chat
            </TabsTrigger>
            <TabsTrigger value="owner" className="gap-2">
              <KeyRound className="h-3.5 w-3.5" /> Owner
            </TabsTrigger>
          </TabsList>

          {/* Announcements page */}
          <TabsContent value="announcements">
            <Card className="bg-background/95 p-4 text-foreground">
              <div className="mb-3 flex items-center gap-2">
                <Megaphone className="h-4 w-4" />
                <h2 className="font-semibold">Official announcements</h2>
              </div>
              <div className="space-y-2">
                {announcements.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No announcements yet. The owner can post one from the Owner tab.
                  </p>
                )}
                {announcements.map((a) => (
                  <div key={a.id} className="rounded-md border border-border p-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        <Badge variant="outline" className="mr-2">{a.author_username}</Badge>
                        {new Date(a.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm">{a.content}</p>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* Chat page */}
          <TabsContent value="chat">
            <Card className="bg-background/95 p-4 text-foreground">
              <div className="mb-3 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <h2 className="font-semibold">Member chat</h2>
              </div>
              <div className="max-h-96 min-h-64 space-y-1.5 overflow-y-auto rounded-md border border-border bg-muted/30 p-3">
                {messages.length === 0 && (
                  <p className="text-sm text-muted-foreground">Be the first to say hi.</p>
                )}
                {messages.map((m) => (
                  <div key={m.id} className="text-sm">
                    <span className="font-mono text-xs text-muted-foreground">
                      [{new Date(m.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}]
                    </span>{" "}
                    <span className="font-semibold">{m.username}:</span>{" "}
                    <span>{m.content}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <Input
                  placeholder={user ? "Type a message…" : "Sign in with Discord to chat"}
                  value={chatText}
                  onChange={(e) => setChatText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") sendMsg(); }}
                  disabled={!user}
                  maxLength={500}
                />
                <Button onClick={sendMsg} disabled={!user} className="gap-1">
                  <Send className="h-3.5 w-3.5" /> Send
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* Owner controls */}
          <TabsContent value="owner">
            <Card className="bg-background/95 p-4 text-foreground">
              <div className="mb-3 flex items-center gap-2">
                <KeyRound className="h-4 w-4" />
                <h2 className="font-semibold">Owner controls</h2>
              </div>
              <Input
                placeholder="Enter owner code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="font-mono"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                The owner code is required to post announcements, change the bio,
                or set the Discord server link.
              </p>

              <div className="mt-6 grid gap-6 md:grid-cols-2">
                {/* Profile editor */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Settings className="h-3.5 w-3.5" /> Profile
                  </div>
                  <label className="text-xs text-muted-foreground">Bio</label>
                  <Textarea
                    placeholder={partner.bio || "Write a short bio…"}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    maxLength={500}
                  />
                  <label className="text-xs text-muted-foreground">
                    Discord server invite (https://…)
                  </label>
                  <Input
                    placeholder={partner.discord_url || "https://discord.gg/your-invite"}
                    value={discordUrl}
                    onChange={(e) => setDiscordUrl(e.target.value)}
                  />
                  <Button size="sm" onClick={saveProfile} className="w-full">
                    Save profile
                  </Button>
                </div>

                {/* Announcement composer */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Megaphone className="h-3.5 w-3.5" /> Post announcement
                  </div>
                  <Textarea
                    placeholder="Write an announcement for your members…"
                    value={annText}
                    onChange={(e) => setAnnText(e.target.value)}
                    rows={4}
                    maxLength={2000}
                  />
                  <Button onClick={submitAnn} className="w-full">Post announcement</Button>

                  {announcements.length > 0 && (
                    <div className="mt-4">
                      <p className="mb-1 text-xs text-muted-foreground">Manage announcements</p>
                      <div className="space-y-1">
                        {announcements.map((a) => (
                          <div
                            key={a.id}
                            className="flex items-center justify-between rounded border border-border px-2 py-1 text-xs"
                          >
                            <span className="truncate">{a.content}</span>
                            <button
                              onClick={() => removeAnn(a.id)}
                              className="ml-2 text-destructive hover:opacity-80"
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
