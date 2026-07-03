
-- Events system
CREATE TABLE public.events_page (
  id INT PRIMARY KEY DEFAULT 1,
  header_image TEXT DEFAULT '',
  description TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT now(),
  CHECK (id = 1)
);
INSERT INTO public.events_page (id) VALUES (1) ON CONFLICT DO NOTHING;
GRANT SELECT ON public.events_page TO anon, authenticated;
GRANT ALL ON public.events_page TO service_role;
ALTER TABLE public.events_page ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read events_page" ON public.events_page FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_date DATE NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  image TEXT DEFAULT '',
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
GRANT SELECT ON public.events TO anon, authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read events" ON public.events FOR SELECT TO anon, authenticated USING (true);

-- Site-wide banner (owner announcement)
CREATE TABLE public.site_banner (
  id INT PRIMARY KEY DEFAULT 1,
  message TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT now(),
  CHECK (id = 1)
);
INSERT INTO public.site_banner (id) VALUES (1) ON CONFLICT DO NOTHING;
GRANT SELECT ON public.site_banner TO anon, authenticated;
GRANT ALL ON public.site_banner TO service_role;
ALTER TABLE public.site_banner ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read banner" ON public.site_banner FOR SELECT TO anon, authenticated USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.events_page;
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.site_banner;
