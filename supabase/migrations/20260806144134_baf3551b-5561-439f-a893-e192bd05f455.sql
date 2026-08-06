CREATE OR REPLACE FUNCTION public.release_anonymous_generation(_fingerprint text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.anonymous_generations
    SET count = GREATEST(count - 1, 0)
    WHERE fingerprint = _fingerprint;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_generation(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.user_profiles
    SET generations_used_this_month = GREATEST(generations_used_this_month - 1, 0)
    WHERE id = _user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.release_anonymous_generation(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_generation(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_anonymous_generation(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_generation(uuid) TO service_role;