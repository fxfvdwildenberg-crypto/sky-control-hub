
CREATE TABLE public.ground_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pilot_discord_id TEXT NOT NULL,
  pilot_username TEXT NOT NULL,
  callsign TEXT NOT NULL,
  gate TEXT NOT NULL,
  aircraft TEXT NOT NULL,
  airport TEXT NOT NULL,
  services TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  crew_discord_id TEXT,
  crew_username TEXT,
  crew_roblox_username TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ground_requests TO anon, authenticated;
GRANT ALL ON public.ground_requests TO service_role;

ALTER TABLE public.ground_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read gr" ON public.ground_requests FOR SELECT USING (true);
CREATE POLICY "public insert gr" ON public.ground_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "public update gr" ON public.ground_requests FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "public delete gr" ON public.ground_requests FOR DELETE USING (true);

CREATE TRIGGER ground_requests_touch BEFORE UPDATE ON public.ground_requests
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.ground_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.ground_requests(id) ON DELETE CASCADE,
  discord_id TEXT NOT NULL,
  username TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.ground_messages TO anon, authenticated;
GRANT ALL ON public.ground_messages TO service_role;

ALTER TABLE public.ground_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read gm" ON public.ground_messages FOR SELECT USING (true);
CREATE POLICY "public insert gm" ON public.ground_messages FOR INSERT WITH CHECK (true);
