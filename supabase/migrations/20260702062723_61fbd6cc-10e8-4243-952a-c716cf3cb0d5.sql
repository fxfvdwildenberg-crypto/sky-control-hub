
CREATE TABLE public.user_profiles (
  discord_id TEXT PRIMARY KEY,
  username TEXT NOT NULL DEFAULT '',
  avatar TEXT,
  tokens INTEGER NOT NULL DEFAULT 0,
  login_streak INTEGER NOT NULL DEFAULT 0,
  last_login_date DATE,
  earned_today INTEGER NOT NULL DEFAULT 0,
  earned_today_date DATE,
  equipped_tag TEXT,
  has_atc_role BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_profiles TO anon, authenticated;
GRANT ALL ON public.user_profiles TO service_role;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read user_profiles" ON public.user_profiles FOR SELECT USING (true);

CREATE TABLE public.user_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_id TEXT NOT NULL,
  tag TEXT NOT NULL,
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(discord_id, tag)
);
GRANT SELECT ON public.user_tags TO anon, authenticated;
GRANT ALL ON public.user_tags TO service_role;
ALTER TABLE public.user_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read user_tags" ON public.user_tags FOR SELECT USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.user_profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_tags;
