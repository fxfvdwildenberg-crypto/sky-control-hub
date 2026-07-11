
-- user_prefs
CREATE TABLE public.user_prefs (
  discord_id text PRIMARY KEY,
  mini_stats boolean NOT NULL DEFAULT true,
  shortcuts jsonb NOT NULL DEFAULT '{}'::jsonb,
  pinned_pages text[] NOT NULL DEFAULT '{}',
  seen_tours text[] NOT NULL DEFAULT '{}',
  theme_choice text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_prefs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_prefs TO authenticated;
GRANT ALL ON public.user_prefs TO service_role;
ALTER TABLE public.user_prefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prefs_read_all" ON public.user_prefs FOR SELECT USING (true);
CREATE POLICY "prefs_write_service" ON public.user_prefs FOR ALL USING (false) WITH CHECK (false);

-- site_theme (singleton)
CREATE TABLE public.site_theme (
  id int PRIMARY KEY DEFAULT 1,
  enabled_themes text[] NOT NULL DEFAULT '{}',
  forced_theme text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT site_theme_singleton CHECK (id = 1)
);
GRANT SELECT ON public.site_theme TO anon, authenticated;
GRANT ALL ON public.site_theme TO service_role;
ALTER TABLE public.site_theme ENABLE ROW LEVEL SECURITY;
CREATE POLICY "site_theme_read_all" ON public.site_theme FOR SELECT USING (true);
INSERT INTO public.site_theme (id, enabled_themes, forced_theme) VALUES (1, '{}', NULL);

-- shop_tags
CREATE TABLE public.shop_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tag text UNIQUE NOT NULL,
  cost int NOT NULL CHECK (cost >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.shop_tags TO anon, authenticated;
GRANT ALL ON public.shop_tags TO service_role;
ALTER TABLE public.shop_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shop_tags_read_all" ON public.shop_tags FOR SELECT USING (true);

INSERT INTO public.shop_tags (tag, cost) VALUES
  ('No life', 200),
  ('Flight master', 100),
  ('Sky boss', 75),
  ('Airbus', 50),
  ('Boeing', 50),
  ('Taxi king', 30),
  ('beginner', 5)
ON CONFLICT (tag) DO NOTHING;

-- friendships
CREATE TABLE public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  friend_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, friend_id)
);
GRANT SELECT ON public.friendships TO anon, authenticated;
GRANT ALL ON public.friendships TO service_role;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "friendships_read_all" ON public.friendships FOR SELECT USING (true);

-- partners: owner-created flag
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS created_by_owner boolean NOT NULL DEFAULT false;
