
-- 1. tickets_enabled toggle on flight_plans
ALTER TABLE public.flight_plans
  ADD COLUMN IF NOT EXISTS tickets_enabled boolean NOT NULL DEFAULT false;

-- 2. tickets table
CREATE TABLE IF NOT EXISTS public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flight_plan_id uuid NOT NULL REFERENCES public.flight_plans(id) ON DELETE CASCADE,
  passenger_discord_id text NOT NULL,
  passenger_discord_username text NOT NULL,
  passenger_roblox_username text NOT NULL,
  seat text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (flight_plan_id, passenger_discord_id)
);

CREATE INDEX IF NOT EXISTS tickets_flight_plan_id_idx ON public.tickets(flight_plan_id);
CREATE INDEX IF NOT EXISTS tickets_passenger_idx ON public.tickets(passenger_discord_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tickets TO authenticated;
GRANT SELECT ON public.tickets TO anon;
GRANT ALL ON public.tickets TO service_role;

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Auth happens through our Discord session in server fns (service_role).
-- Allow public reads so the dashboard can show ticket counts/badges.
CREATE POLICY "tickets readable" ON public.tickets FOR SELECT USING (true);
CREATE POLICY "tickets service role write" ON public.tickets FOR ALL USING (false) WITH CHECK (false);

-- 3. Realtime: add the missing tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.ground_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ground_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.partner_announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.partner_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.atc_claims;

-- Make sure UPDATE/DELETE payloads include full old row
ALTER TABLE public.ground_requests REPLICA IDENTITY FULL;
ALTER TABLE public.ground_messages REPLICA IDENTITY FULL;
ALTER TABLE public.tickets REPLICA IDENTITY FULL;
ALTER TABLE public.partner_announcements REPLICA IDENTITY FULL;
ALTER TABLE public.partner_messages REPLICA IDENTITY FULL;
ALTER TABLE public.atc_claims REPLICA IDENTITY FULL;
