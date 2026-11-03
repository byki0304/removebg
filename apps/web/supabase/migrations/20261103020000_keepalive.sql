-- Keep-alive heartbeat: free-tier projects are paused after a period without external traffic.
-- A daily scheduled request (03:00-04:00 KST) calls keepalive_check(); it writes a heartbeat
-- only when nothing touched the database in the previous 24 hours.

CREATE TABLE IF NOT EXISTS public.keepalive (
    id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    last_ping_at TIMESTAMPTZ,
    ping_count BIGINT NOT NULL DEFAULT 0
);
INSERT INTO public.keepalive (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.keepalive ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.keepalive FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.keepalive_check()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    last_activity TIMESTAMPTZ;
    pinged BOOLEAN := FALSE;
BEGIN
    SELECT GREATEST(
        (SELECT MAX(GREATEST(u.last_sign_in_at, u.created_at)) FROM auth.users u),
        (SELECT MAX(GREATEST(p.last_login_at, p.updated_at)) FROM public.profiles p),
        (SELECT MAX(j.created_at) FROM public.jobs j),
        (SELECT k.last_ping_at FROM public.keepalive k WHERE k.id = 1)
    ) INTO last_activity;

    IF last_activity IS NULL OR last_activity < NOW() - INTERVAL '24 hours' THEN
        UPDATE public.keepalive SET last_ping_at = NOW(), ping_count = ping_count + 1 WHERE id = 1;
        pinged := TRUE;
    END IF;

    RETURN jsonb_build_object('pinged', pinged, 'last_activity_at', last_activity, 'checked_at', NOW());
END;
$$;

REVOKE ALL ON FUNCTION public.keepalive_check() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.keepalive_check() TO service_role;
