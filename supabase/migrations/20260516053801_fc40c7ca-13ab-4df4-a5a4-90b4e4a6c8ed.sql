
ALTER TABLE public.flight_plans
  ADD COLUMN IF NOT EXISTS roblox_username text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS discord_username text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS copilot_discord_username text NOT NULL DEFAULT '';

ALTER TABLE public.flight_plans
  ALTER COLUMN squawk SET DEFAULT '1000';
