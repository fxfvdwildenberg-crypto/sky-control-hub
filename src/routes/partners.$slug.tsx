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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Megaphone, MessageSquare, Settings, Send, Trash2, KeyRound, Loader2 } from "lucide-react";

export const Route = createFileRoute("/partners/$slug")({
  component: PartnerDashboard,
});

function PartnerDashboard() {
  const { slug } = Route.useParams();
  const fn = useServerFn(getPartner);
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();
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
        <p className="text-destructive">Partner not found.</p>
        <Link to="/partners"><Button variant="outline" className="mt-4">Back to partners</Button></Link>
      </div>
    );
  }

  const { partner, announcements, messages } = data;
  const theme = (partner.theme ?? {}) as { bg?: string; text?: string; primary?: string; accent?: string };

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
      await updFn({ data: { slug, code, bio: bio || partner.bio, discord_url: discordUrl || partner.discord_url } });
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
        <div className="mb-6 flex items-center justify-between">
          <Link to="/partners">
            <Button size="sm" variant="secondary" className="gap-2">
              <ArrowLeft className="h-3.5 w-3.5" /> All partners
            </Button>
          </Link>
          {partner.discord_url && (
            <a href={partner.discord_url} target="_blank" rel="noreferrer">
              <Button size="sm" style={{ background: theme.accent, color: theme.primary }}>
                Join Discord
              </Button>
            </a>
          )}
        </div>

        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">{partner.name}</h1>
          <p className="mt-1 opacity-90">{partner.bio}</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Owner controls */}
          <Card className="lg:col-span-1 bg-background/90 text-foreground p-4">
            <div className="mb-3 flex items-center gap-2">
              <KeyRound className="h-4 w-4" />
              <h2 className="font-semibold">Owner code</h2>
            </div>
            <Input
              placeholder="Enter owner code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="font-mono"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Required to post announcements or update the dashboard.
            </p>

            <div className="mt-5 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Settings className="h-3.5 w-3.5" /> Update profile
              </div>
              <Textarea
                placeholder={`Bio (current: ${partner.bio || "—"})`}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                maxLength={500}
              />
              <Input
                placeholder="Discord invite URL (https://…)"
                value={discordUrl}
                onChange={(e) => setDiscordUrl(e.target.value)}
              />
              <Button size="sm" onClick={saveProfile} className="w-full">Save profile</Button>
            </div>
          </Card>

          {/* Announcements */}
          <Card className="lg:col-span-2 bg-background/90 text-foreground p-4">
            <div className="mb-3 flex items-center gap-2">
              <Megaphone className="h-4 w-4" />
              <h2 className="font-semibold">Announcements</h2>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Textarea
                placeholder="New announcement (requires owner code)…"
                value={annText}
                onChange={(e) => setAnnText(e.target.value)}
                rows={2}
                maxLength={2000}
              />
              <Button onClick={submitAnn} className="sm:self-end">Post</Button>
            </div>
            <div className="mt-4 space-y-2">
              {announcements.length === 0 && (
                <p className="text-sm text-muted-foreground">No announcements yet.</p>
              )}
              {announcements.map((a) => (
                <div key={a.id} className="rounded-md border border-border p-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span><Badge variant="outline" className="mr-2">{a.author_username}</Badge>{new Date(a.created_at).toLocaleString()}</span>
                    <button
                      onClick={() => removeAnn(a.id)}
                      className="text-destructive hover:opacity-80"
                      title="Delete (owner code required)"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm">{a.content}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Chat */}
          <Card className="lg:col-span-3 bg-background/90 text-foreground p-4">
            <div className="mb-3 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <h2 className="font-semibold">Member chat</h2>
            </div>
            <div className="max-h-80 space-y-1.5 overflow-y-auto rounded-md border border-border bg-muted/30 p-3">
              {messages.length === 0 && (
                <p className="text-sm text-muted-foreground">Be the first to say hi.</p>
              )}
              {messages.map((m) => (
                <div key={m.id} className="text-sm">
                  <span className="font-mono text-xs text-muted-foreground">
                    [{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}]
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
        </div>
      </div>
    </div>
  );
}
