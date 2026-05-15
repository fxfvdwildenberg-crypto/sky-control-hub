
-- 1. flight_plans new fields
ALTER TABLE public.flight_plans
  ADD COLUMN IF NOT EXISTS flight_rule text NOT NULL DEFAULT 'IFR',
  ADD COLUMN IF NOT EXISTS cruise_level text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS gate text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS filer_discord_id text,
  ADD COLUMN IF NOT EXISTS filer_username text,
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;

-- 2. atis runway -> departure/arrival runways
ALTER TABLE public.atis
  ADD COLUMN IF NOT EXISTS departure_runways text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS arrival_runways text NOT NULL DEFAULT '';

UPDATE public.atis
  SET departure_runways = COALESCE(NULLIF(departure_runways,''), runway),
      arrival_runways   = COALESCE(NULLIF(arrival_runways,''),   runway)
  WHERE runway IS NOT NULL;

ALTER TABLE public.atis DROP COLUMN IF EXISTS runway;

-- length constraints
ALTER TABLE public.atis
  DROP CONSTRAINT IF EXISTS atis_dep_rwy_len,
  DROP CONSTRAINT IF EXISTS atis_arr_rwy_len;
ALTER TABLE public.atis
  ADD CONSTRAINT atis_dep_rwy_len CHECK (char_length(departure_runways) <= 10),
  ADD CONSTRAINT atis_arr_rwy_len CHECK (char_length(arrival_runways) <= 10);

-- 3. ATIS dedup trigger: same ICAO with greater info letter replaces lesser ones
CREATE OR REPLACE FUNCTION public.atis_dedup()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.atis
   WHERE icao = NEW.icao
     AND id <> NEW.id
     AND info < NEW.info;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS atis_dedup_trg ON public.atis;
CREATE TRIGGER atis_dedup_trg
  AFTER INSERT OR UPDATE ON public.atis
  FOR EACH ROW EXECUTE FUNCTION public.atis_dedup();

-- 4. Auto-approve pending flight plans after 5 minutes via pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  PERFORM cron.unschedule('auto-approve-flight-plans');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'auto-approve-flight-plans',
  '* * * * *',
  $$UPDATE public.flight_plans
       SET approval_status = 'approved', approved_at = now()
     WHERE approval_status = 'pending'
       AND created_at < now() - interval '5 minutes';$$
);
