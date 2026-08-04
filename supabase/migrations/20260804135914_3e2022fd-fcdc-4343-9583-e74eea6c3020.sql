UPDATE public.user_profiles
SET plan = 'paid',
    plan_active = true,
    generations_used_this_month = 0,
    billing_period_start = now(),
    updated_at = now()
WHERE id = 'c3aeefe0-ead9-494e-9165-92c11a86d474';