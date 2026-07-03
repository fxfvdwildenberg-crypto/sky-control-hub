import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { ArrowLeft, Calendar, Pencil, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getEvent, upsertEvent } from "@/lib/events.functions";
import { useCurrentUser } from "@/lib/use-current-user";
import { OWNER_DISCORD_ID } from "@/lib/owner.functions";

export const Route = createFileRoute("/events/$id")({
  head: () => ({ meta: [{ title: "Event — ATC365" }] }),
  component: EventDetail,
});

function EventDetail() {
  const { id } = Route.useParams();
  const load = useServerFn(getEvent);
  const { data: user } = useCurrentUser();
  const isOwner = user?.discordId === OWNER_DISCORD_ID;
  const { data: ev } = useQuery({ queryKey: ["event", id], queryFn: () => load({ data: { id } }), refetchInterval: 30000 });

  if (!ev) return <div className="p-6 text-sm text-muted-foreground font-mono">Loading event…</div>;
  const event = ev as { id: string; title: string; image: string; description: string; event_date: string };

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-4 py-6 md:px-8">
      <Link to="/events" className="inline-flex items-center gap-1 text-sm text-primary"><ArrowLeft className="h-4 w-4" /> All events</Link>
      {isOwner ? (
        <OwnerEditor event={event} />
      ) : (
        <>
          {event.image && (
            <div className="relative h-56 md:h-80 overflow-hidden rounded-2xl border">
              <img src={event.image} alt="" className="h-full w-full object-cover" />
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold">{event.title}</h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground"><Calendar className="h-4 w-4" /> {new Date(event.event_date + "T00:00:00Z").toLocaleDateString(undefined, { dateStyle: "full" })}</p>
          </div>
          <Card><CardContent className="p-6 whitespace-pre-wrap text-sm leading-relaxed">{event.description || "No details for this event yet."}</CardContent></Card>
        </>
      )}
    </div>
  );
}

function OwnerEditor({ event }: { event: { id: string; title: string; image: string; description: string; event_date: string } }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(event.title);
  const [image, setImage] = useState(event.image);
  const [description, setDescription] = useState(event.description);
  const [date, setDate] = useState(event.event_date);
  const fn = useServerFn(upsertEvent);
  const qc = useQueryClient();

  useEffect(() => {
    setTitle(event.title); setImage(event.image); setDescription(event.description); setDate(event.event_date);
  }, [event.id, event.title, event.image, event.description, event.event_date]);

  const save = useMutation({
    mutationFn: () => fn({ data: { id: event.id, title, image, description, event_date: date } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["event", event.id] }); qc.invalidateQueries({ queryKey: ["events-page"] }); toast.success("Saved"); setEditing(false); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!editing) {
    return (
      <>
        {image && <div className="relative h-56 md:h-80 overflow-hidden rounded-2xl border"><img src={image} alt="" className="h-full w-full object-cover" /></div>}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">{title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{new Date(date + "T00:00:00Z").toLocaleDateString(undefined, { dateStyle: "full" })}</p>
          </div>
          <Button size="sm" onClick={() => setEditing(true)}><Pencil className="h-3.5 w-3.5 mr-1" /> Edit</Button>
        </div>
        <Card><CardContent className="p-6 whitespace-pre-wrap text-sm leading-relaxed">{description || "No details for this event yet."}</CardContent></Card>
      </>
    );
  }
  return (
    <Card>
      <CardContent className="space-y-2 p-4">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Input placeholder="Image URL" value={image} onChange={(e) => setImage(e.target.value)} />
        <Textarea rows={8} placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        <div className="flex gap-2">
          <Button onClick={() => save.mutate()} disabled={save.isPending}><Save className="h-3.5 w-3.5 mr-1" /> Save</Button>
          <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
        </div>
      </CardContent>
    </Card>
  );
}
