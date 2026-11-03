-- RemoveBg AI: profiles, jobs, RLS, 72-hour TTL cleanup
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    account_type TEXT NOT NULL CHECK (account_type IN ('email', 'mobile', 'google', 'guest')),
    email TEXT,
    mobile_country_code TEXT,
    mobile_national TEXT,
    mobile_e164 TEXT,
    nickname TEXT,
    preferred_locale TEXT NOT NULL DEFAULT 'ko' CHECK (preferred_locale IN ('ko', 'en', 'ja')),
    guest_session_active BOOLEAN NOT NULL DEFAULT FALSE,
    guest_expires_at TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT guest_requires_nickname CHECK (account_type <> 'guest' OR nickname IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_profiles_mobile
    ON public.profiles (mobile_e164) WHERE mobile_e164 IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_guest_nickname
    ON public.profiles (lower(nickname)) WHERE account_type = 'guest' AND guest_session_active = TRUE;

CREATE TABLE IF NOT EXISTS public.jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    is_guest BOOLEAN NOT NULL DEFAULT FALSE,
    original_file_name TEXT NOT NULL,
    original_file_url TEXT,
    result_file_url TEXT,
    status TEXT NOT NULL DEFAULT 'QUEUED'
        CHECK (status IN ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'EXPIRED')),
    options JSONB NOT NULL DEFAULT '{"autoTrim": true, "padding": 2, "defringing": true, "outputFormat": "png", "aiMode": "ultra"}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    file_expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '72 hours')
);

CREATE INDEX IF NOT EXISTS idx_jobs_user_created ON public.jobs (user_id, created_at DESC);

-- Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_profile_select" ON public.profiles
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "own_profile_update" ON public.profiles
    FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Users may only change their language preference; everything else goes through server routes.
REVOKE UPDATE ON public.profiles FROM authenticated, anon;
GRANT UPDATE (preferred_locale, updated_at) ON public.profiles TO authenticated;

CREATE POLICY "own_jobs_active" ON public.jobs
    FOR ALL
    USING (
        auth.uid() = user_id
        AND NOT EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.account_type = 'guest' AND p.guest_session_active = FALSE
        )
    )
    WITH CHECK (auth.uid() = user_id);

-- Hourly TTL cleanup
SELECT cron.schedule('ttl-cleanup-hourly', '0 * * * *', $$
    UPDATE public.jobs
       SET original_file_url = NULL, result_file_url = NULL, status = 'EXPIRED'
     WHERE is_guest = FALSE AND file_expires_at < NOW() AND status <> 'EXPIRED';

    DELETE FROM auth.users u
     USING public.profiles p
     WHERE p.id = u.id AND p.account_type = 'guest' AND p.guest_expires_at < NOW();
$$);
