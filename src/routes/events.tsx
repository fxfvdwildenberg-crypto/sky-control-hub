import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Calendar as CalendarIcon, Pencil, Plus, Trash2, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { useCurrentUser } from "@/lib/use-current-user";
import { OWNER_DISCORD_ID } from "@/lib/owner.functions";
import { getEventsPage, updateEventsPage, upsertEvent, deleteEvent } from "@/lib/events.functions";

export const Route = createFileRoute("/events")({
  head: () => ({
    meta: [
      { title: "Events — ATC365" },
      { name: "description", content: "ATC365 events, meetups, and flight nights." },
    ],
  }),
  component: EventsPage,
});

function EventsPage() {
  const load = useServerFn(getEventsPage);
  const { data } = useQuery({ queryKey: ["events-page"], queryFn: () => load(), refetchInterval: 30000 });
  const { data: user } = useCurrentUser();
  const isOwner = user?.discordId === OWNER_DISCORD_ID;

  const page = data?.page ?? { header_image: "", description: "" };
  const events = data?.events ?? [];

  const eventsByDate = useMemo(() => {
    const m = new Map<string, typeof events>();
    for (const e of events) {
      const d = (e as { event_date: string }).event_date;
      if (!m.has(d)) m.set(d, [] as typeof events);
      m.get(d)!.push(e);
    }
    return m;
  }, [events]);

  const eventDates = useMemo(() => events.map((e) => new Date((e as { event_date: string }).event_date + "T00:00:00Z")), [events]);

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const selectedKey = selectedDate?.toISOString().slice(0, 10);
  const dayEvents = selectedKey ? eventsByDate.get(selectedKey) ?? [] : [];

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-8">
      {/* Header image */}
      <div className="relative h-48 md:h-64 overflow-hidden rounded-2xl border bg-muted">
        {page.header_image ? (
          <img src={page.header_image} alt="Events header" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
            <ImageIcon className="h-8 w-8 mr-2" /> No header image yet
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        <div className="absolute bottom-4 left-6">
          <h1 className="text-3xl font-bold">Events</h1>
          <p className="text-sm text-muted-foreground">Upcoming ATC365 happenings</p>
        </div>
      </div>

      {isOwner && <OwnerPageEditor page={page} />}

      {page.description && (
        <Card>
          <CardContent className="p-5 whitespace-pre-wrap text-sm leading-relaxed">{page.description}</CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2"><CalendarIcon className="h-4 w-4" /> {selectedKey ? new Date(selectedKey + "T00:00:00Z").toLocaleDateString(undefined, { dateStyle: "full" }) : "Pick a date"}</CardTitle>
            {isOwner && selectedKey && <OwnerEventDialog defaultDate={selectedKey} />}
          </CardHeader>
          <CardContent className="space-y-2">
            {dayEvents.length === 0 && <p className="text-sm text-muted-foreground">No events on this day.</p>}
            {dayEvents.map((e) => {
              const ev = e as { id: string; title: string; image: string; description: string; event_date: string };
              return (
                <div key={ev.id} className="flex items-center gap-3 rounded-lg border p-3 hover:border-primary/50 transition">
                  {ev.image && <img src={ev.image} alt="" className="h-14 w-14 rounded-md object-cover" />}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{ev.title}</div>
                    <div className="text-xs text-muted-foreground line-clamp-1">{ev.description || "No description"}</div>
                  </div>
                  <Link to="/events/$id" params={{ id: ev.id }}>
                    <Button size="sm" variant="secondary">Open</Button>
                  </Link>
                  {isOwner && <OwnerEventDialog existing={ev} />}
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Calendar</CardTitle></CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              modifiers={{ hasEvent: eventDates }}
              modifiersClassNames={{ hasEvent: "bg-primary/25 text-primary font-bold rounded-full" }}
              className="pointer-events-auto"
            />
            <p className="mt-3 text-[11px] text-muted-foreground">Highlighted days have scheduled events.</p>
          </CardContent>
        </Card>
      </div>

      {events.length > 0 && (
        <Card>
          <CardHeader><CardTitle>All upcoming</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {events.map((e) => {
              const ev = e as { id: string; title: string; event_date: string };
              return (
                <Link key={ev.id} to="/events/$id" params={{ id: ev.id }} className="flex items-center justify-between rounded-md border px-3 py-2 hover:border-primary/50 transition">
                  <div>
                    <div className="text-sm font-medium">{ev.title}</div>
                    <div className="text-xs text-muted-foreground font-mono">{new Date(ev.event_date + "T00:00:00Z").toLocaleDateString()}</div>
                  </div>
                  <span className="text-xs text-primary">Open →</span>
                </Link>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function OwnerPageEditor({ page }: { page: { header_image: string; description: string } }) {
  const [img, setImg] = useState(page.header_image);
  const [desc, setDesc] = useState(page.description);
  const fn = useServerFn(updateEventsPage);
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: () => fn({ data: { header_image: img, description: desc } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["events-page"] }); toast.success("Saved"); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Card className="border-dashed">
      <CardHeader><CardTitle className="text-sm">Owner controls · Header & intro</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <Input value={img} onChange={(e) => setImg(e.target.value)} placeholder="Header image URL" />
        <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Intro text shown below the image" rows={4} />
        <Button size="sm" onClick={() => mut.mutate()} disabled={mut.isPending}>Save</Button>
      </CardContent>
    </Card>
  );
}

function OwnerEventDialog({ defaultDate, existing }: { defaultDate?: string; existing?: { id: string; title: string; image: string; description: string; event_date: string } }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(existing?.event_date ?? defaultDate ?? new Date().toISOString().slice(0, 10));
  const [title, setTitle] = useState(existing?.title ?? "");
  const [image, setImage] = useState(existing?.image ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const saveFn = useServerFn(upsertEvent);
  const delFn = useServerFn(deleteEvent);
  const qc = useQueryClient();
  const save = useMutation({
    mutationFn: () => saveFn({ data: { id: existing?.id, event_date: date, title, image, description } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["events-page"] }); toast.success("Event saved"); setOpen(false); },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: () => delFn({ data: { id: existing!.id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["events-page"] }); toast.success("Deleted"); setOpen(false); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant={existing ? "ghost" : "default"}>
          {existing ? <Pencil className="h-3.5 w-3.5" /> : <><Plus className="h-3.5 w-3.5 mr-1" /> Add event</>}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{existing ? "Edit event" : "New event"}</DialogTitle></DialogHeader>
        <div className="space-y-2">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input placeholder="Image URL (optional)" value={image} onChange={(e) => setImage(e.target.value)} />
          <Textarea placeholder="Description" rows={5} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <DialogFooter className="gap-2">
          {existing && (
            <Button variant="destructive" size="sm" onClick={() => del.mutate()}>
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
            </Button>
          )}
          <Button onClick={() => save.mutate()} disabled={!title || save.isPending}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
