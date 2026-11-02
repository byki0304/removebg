-- Google (OAuth) users get their profile row as soon as Supabase creates the auth user,
-- so the OAuth callback does not depend on the service role key.
CREATE OR REPLACE FUNCTION public.handle_new_oauth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NEW.raw_app_meta_data->>'provider' = 'google' THEN
        INSERT INTO public.profiles (id, account_type, email, last_login_at)
        VALUES (NEW.id, 'google', NEW.email, NOW())
        ON CONFLICT (id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_oauth_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created_oauth ON auth.users;
CREATE TRIGGER on_auth_user_created_oauth
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_oauth_user();
