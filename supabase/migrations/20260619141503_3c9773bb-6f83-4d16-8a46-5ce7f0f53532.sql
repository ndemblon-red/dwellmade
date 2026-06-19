
-- updated_at helper
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- projects
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Untitled project',
  master_palette jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_projects" ON public.projects FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER projects_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX projects_user_id_idx ON public.projects(user_id, updated_at DESC);

-- security-definer helpers
CREATE OR REPLACE FUNCTION public.is_project_owner(p_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.projects WHERE id = p_id AND user_id = auth.uid())
$$;

-- rooms
CREATE TABLE public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Untitled room',
  room_photo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rooms TO authenticated;
GRANT ALL ON public.rooms TO service_role;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_rooms" ON public.rooms FOR ALL TO authenticated
  USING (public.is_project_owner(project_id))
  WITH CHECK (public.is_project_owner(project_id));
CREATE TRIGGER rooms_updated_at BEFORE UPDATE ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX rooms_project_id_idx ON public.rooms(project_id, created_at);

CREATE OR REPLACE FUNCTION public.is_room_owner(r_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.rooms r
    JOIN public.projects p ON p.id = r.project_id
    WHERE r.id = r_id AND p.user_id = auth.uid()
  )
$$;

-- inspiration_images
CREATE TABLE public.inspiration_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  tags jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inspiration_images TO authenticated;
GRANT ALL ON public.inspiration_images TO service_role;
ALTER TABLE public.inspiration_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_inspo" ON public.inspiration_images FOR ALL TO authenticated
  USING (public.is_room_owner(room_id))
  WITH CHECK (public.is_room_owner(room_id));
CREATE INDEX inspo_room_idx ON public.inspiration_images(room_id, created_at);

-- aesthetic_briefs (one per room)
CREATE TABLE public.aesthetic_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL UNIQUE REFERENCES public.rooms(id) ON DELETE CASCADE,
  palette jsonb NOT NULL DEFAULT '[]'::jsonb,
  materials jsonb NOT NULL DEFAULT '[]'::jsonb,
  furniture_style text NOT NULL DEFAULT '',
  vibe text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aesthetic_briefs TO authenticated;
GRANT ALL ON public.aesthetic_briefs TO service_role;
ALTER TABLE public.aesthetic_briefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_brief" ON public.aesthetic_briefs FOR ALL TO authenticated
  USING (public.is_room_owner(room_id))
  WITH CHECK (public.is_room_owner(room_id));
CREATE TRIGGER briefs_updated_at BEFORE UPDATE ON public.aesthetic_briefs
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- generations
CREATE TABLE public.generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  result_image_url text NOT NULL,
  prompt_used text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.generations TO authenticated;
GRANT ALL ON public.generations TO service_role;
ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_generations" ON public.generations FOR ALL TO authenticated
  USING (public.is_room_owner(room_id))
  WITH CHECK (public.is_room_owner(room_id));
CREATE INDEX generations_room_idx ON public.generations(room_id, created_at DESC);
