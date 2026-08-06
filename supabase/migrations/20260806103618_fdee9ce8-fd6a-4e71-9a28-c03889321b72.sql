
CREATE OR REPLACE FUNCTION public.consume_generation(_user_id uuid, _limit integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p public.user_profiles%ROWTYPE;
  start_ts timestamptz;
  used_now integer;
  paid boolean;
BEGIN
  INSERT INTO public.user_profiles (id) VALUES (_user_id)
  ON CONFLICT (id) DO NOTHING;

  SELECT * INTO p FROM public.user_profiles WHERE id = _user_id FOR UPDATE;

  paid := COALESCE(p.comp, false) OR (COALESCE(p.plan_active, false) AND p.plan = 'paid');
  IF NOT paid THEN
    RETURN jsonb_build_object('allowed', false, 'code', 'upgrade_required',
      'kind', 'free', 'used', COALESCE(p.generations_used_this_month, 0), 'limit', _limit);
  END IF;

  -- Roll the allowance forward on the billing anniversary.
  start_ts := COALESCE(p.billing_period_start, now());
  used_now := COALESCE(p.generations_used_this_month, 0);
  IF now() >= start_ts + interval '1 month' THEN
    start_ts := start_ts + (interval '1 month' *
      floor(EXTRACT(epoch FROM age(now(), start_ts)) / EXTRACT(epoch FROM interval '30 days')));
    WHILE now() >= start_ts + interval '1 month' LOOP
      start_ts := start_ts + interval '1 month';
    END LOOP;
    used_now := 0;
  END IF;

  IF used_now >= _limit THEN
    UPDATE public.user_profiles
      SET generations_used_this_month = used_now, billing_period_start = start_ts
      WHERE id = _user_id;
    RETURN jsonb_build_object('allowed', false, 'code', 'limit_reached',
      'kind', 'paid', 'used', used_now, 'limit', _limit,
      'resets_at', start_ts + interval '1 month');
  END IF;

  UPDATE public.user_profiles
    SET generations_used_this_month = used_now + 1, billing_period_start = start_ts
    WHERE id = _user_id;

  RETURN jsonb_build_object('allowed', true, 'kind', 'paid',
    'used', used_now + 1, 'limit', _limit, 'resets_at', start_ts + interval '1 month');
END;
$$;

REVOKE ALL ON FUNCTION public.consume_generation(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_generation(uuid, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.consume_anonymous_generation(_fingerprint text, _limit integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c integer;
BEGIN
  INSERT INTO public.anonymous_generations (fingerprint, count)
  VALUES (_fingerprint, 0)
  ON CONFLICT (fingerprint) DO NOTHING;

  SELECT count INTO c FROM public.anonymous_generations
  WHERE fingerprint = _fingerprint FOR UPDATE;

  IF c >= _limit THEN
    RETURN jsonb_build_object('allowed', false, 'code', 'limit_reached',
      'kind', 'anonymous', 'used', c, 'limit', _limit);
  END IF;

  UPDATE public.anonymous_generations
    SET count = c + 1, last_used_at = now()
    WHERE fingerprint = _fingerprint;

  RETURN jsonb_build_object('allowed', true, 'kind', 'anonymous',
    'used', c + 1, 'limit', _limit);
END;
$$;

REVOKE ALL ON FUNCTION public.consume_anonymous_generation(text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_anonymous_generation(text, integer) TO service_role;
