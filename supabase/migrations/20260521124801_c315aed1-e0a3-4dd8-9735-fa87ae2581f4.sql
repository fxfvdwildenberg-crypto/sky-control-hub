
CREATE TABLE public.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  bio text NOT NULL DEFAULT '',
  discord_url text NOT NULL DEFAULT '',
  owner_code text NOT NULL,
  theme jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read partners" ON public.partners FOR SELECT USING (true);
CREATE POLICY "public update partners" ON public.partners FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "public insert partners" ON public.partners FOR INSERT WITH CHECK (true);

CREATE TABLE public.partner_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  author_username text NOT NULL DEFAULT 'Owner',
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.partner_announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read pa" ON public.partner_announcements FOR SELECT USING (true);
CREATE POLICY "public insert pa" ON public.partner_announcements FOR INSERT WITH CHECK (true);
CREATE POLICY "public delete pa" ON public.partner_announcements FOR DELETE USING (true);

CREATE TABLE public.partner_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  discord_id text NOT NULL,
  username text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.partner_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read pm" ON public.partner_messages FOR SELECT USING (true);
CREATE POLICY "public insert pm" ON public.partner_messages FOR INSERT WITH CHECK (true);

CREATE INDEX idx_pa_partner ON public.partner_announcements(partner_id, created_at DESC);
CREATE INDEX idx_pm_partner ON public.partner_messages(partner_id, created_at ASC);

INSERT INTO public.partners (slug, name, bio, discord_url, owner_code, theme) VALUES
('biman-bangladesh', 'Biman Bangladesh Airlines', 'The national flag carrier of Bangladesh.', '', 'BIMAN-7K3X9P',
  '{"primary":"#006A4E","accent":"#F42A41","bg":"linear-gradient(135deg,#003d2c 0%,#006A4E 50%,#8a1422 100%)","text":"#ffffff"}'::jsonb),
('flydubai', 'flydubai', 'Dubai-based low-cost carrier connecting underserved markets.', '', 'FLYDXB-Q8M2R5',
  '{"primary":"#EA5B0C","accent":"#002F5F","bg":"linear-gradient(135deg,#001a36 0%,#002F5F 55%,#EA5B0C 100%)","text":"#ffffff"}'::jsonb),
('swiss-airways', 'SWISS Airways', 'Swiss precision in the air. Welcome aboard.', '', 'SWISS-A4N6V1',
  '{"primary":"#E30613","accent":"#ffffff","bg":"linear-gradient(135deg,#7a0309 0%,#E30613 60%,#1a1a1a 100%)","text":"#ffffff"}'::jsonb);
