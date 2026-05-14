CREATE TABLE public.atc_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id text NOT NULL UNIQUE,
  channel_name text NOT NULL,
  discord_id text NOT NULL,
  username text NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.atc_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read atc_claims" ON public.atc_claims FOR SELECT USING (true);
CREATE POLICY "public insert atc_claims" ON public.atc_claims FOR INSERT WITH CHECK (true);
CREATE POLICY "public delete atc_claims" ON public.atc_claims FOR DELETE USING (true);
CREATE POLICY "public update atc_claims" ON public.atc_claims FOR UPDATE USING (true) WITH CHECK (true);