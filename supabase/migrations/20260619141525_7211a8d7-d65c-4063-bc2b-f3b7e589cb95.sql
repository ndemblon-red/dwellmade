
-- Drop policies, helpers, and recreate inline (no SECURITY DEFINER functions exposed)
DROP POLICY IF EXISTS "own_rooms" ON public.rooms;
DROP POLICY IF EXISTS "own_inspo" ON public.inspiration_images;
DROP POLICY IF EXISTS "own_brief" ON public.aesthetic_briefs;
DROP POLICY IF EXISTS "own_generations" ON public.generations;
DROP FUNCTION IF EXISTS public.is_project_owner(uuid);
DROP FUNCTION IF EXISTS public.is_room_owner(uuid);

CREATE POLICY "own_rooms" ON public.rooms FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid()));

CREATE POLICY "own_inspo" ON public.inspiration_images FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.rooms r JOIN public.projects p ON p.id = r.project_id
    WHERE r.id = room_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.rooms r JOIN public.projects p ON p.id = r.project_id
    WHERE r.id = room_id AND p.user_id = auth.uid()));

CREATE POLICY "own_brief" ON public.aesthetic_briefs FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.rooms r JOIN public.projects p ON p.id = r.project_id
    WHERE r.id = room_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.rooms r JOIN public.projects p ON p.id = r.project_id
    WHERE r.id = room_id AND p.user_id = auth.uid()));

CREATE POLICY "own_generations" ON public.generations FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.rooms r JOIN public.projects p ON p.id = r.project_id
    WHERE r.id = room_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.rooms r JOIN public.projects p ON p.id = r.project_id
    WHERE r.id = room_id AND p.user_id = auth.uid()));
