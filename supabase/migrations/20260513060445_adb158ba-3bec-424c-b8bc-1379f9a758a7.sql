
CREATE TYPE public.flight_status AS ENUM ('parked','taxi','airborne','landed');

CREATE TABLE public.flight_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  callsign TEXT NOT NULL,
  aircraft TEXT NOT NULL,
  departure TEXT NOT NULL,
  arrival TEXT NOT NULL,
  route TEXT NOT NULL DEFAULT '',
  squawk TEXT NOT NULL DEFAULT '',
  status public.flight_status NOT NULL DEFAULT 'parked',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.atis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  icao TEXT NOT NULL,
  runway TEXT NOT NULL,
  wind TEXT NOT NULL,
  qnh TEXT NOT NULL,
  info TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.flight_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read flight_plans" ON public.flight_plans FOR SELECT USING (true);
CREATE POLICY "public insert flight_plans" ON public.flight_plans FOR INSERT WITH CHECK (true);
CREATE POLICY "public update flight_plans" ON public.flight_plans FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "public delete flight_plans" ON public.flight_plans FOR DELETE USING (true);

CREATE POLICY "public read atis" ON public.atis FOR SELECT USING (true);
CREATE POLICY "public insert atis" ON public.atis FOR INSERT WITH CHECK (true);
CREATE POLICY "public update atis" ON public.atis FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "public delete atis" ON public.atis FOR DELETE USING (true);

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_flight_plans_updated BEFORE UPDATE ON public.flight_plans
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trg_atis_updated BEFORE UPDATE ON public.atis
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.flight_plans;
ALTER PUBLICATION supabase_realtime ADD TABLE public.atis;
ALTER TABLE public.flight_plans REPLICA IDENTITY FULL;
ALTER TABLE public.atis REPLICA IDENTITY FULL;
