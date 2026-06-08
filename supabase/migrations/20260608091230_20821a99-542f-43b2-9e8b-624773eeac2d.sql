
ALTER TABLE public.flight_plans
  ADD COLUMN IF NOT EXISTS flight_date date,
  ADD COLUMN IF NOT EXISTS etd time,
  ADD COLUMN IF NOT EXISTS eta time,
  ADD COLUMN IF NOT EXISTS phase text NOT NULL DEFAULT 'on_ground';

ALTER TABLE public.flight_plans
  DROP CONSTRAINT IF EXISTS flight_plans_phase_check;
ALTER TABLE public.flight_plans
  ADD CONSTRAINT flight_plans_phase_check CHECK (phase IN ('departure','arrival','on_ground'));
