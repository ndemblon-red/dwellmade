CREATE TABLE IF NOT EXISTS public.webhook_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb
);
GRANT ALL ON public.webhook_log TO service_role;
ALTER TABLE public.webhook_log ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_webhook_log_received_at ON public.webhook_log (received_at DESC);