/*
# Synchronize administrator records automatically

1. Database Function
- Adds a server-side trigger function that mirrors administrator profile changes into `admin_accounts`.
- The function runs with a fixed search path and cannot be called directly by anonymous users.

2. Trigger Behavior
- When a profile becomes an administrator, its username, name, linked authentication account, and active status are inserted or updated in `admin_accounts`.
- When an administrator profile is edited, the dedicated administrator record stays synchronized.

3. Security
- The trigger function is not executable by `anon` or `authenticated` clients.
- Administrator table writes happen only inside the trusted database trigger.
- Passwords remain exclusively managed by Supabase Auth.
*/

CREATE OR REPLACE FUNCTION public.sync_admin_account()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'admin' AND NEW.username IS NOT NULL THEN
    INSERT INTO public.admin_accounts (auth_user_id, username, full_name, is_active)
    VALUES (NEW.id, NEW.username, trim(NEW.full_name), NEW.is_active)
    ON CONFLICT (auth_user_id) DO UPDATE
    SET username = EXCLUDED.username,
        full_name = EXCLUDED.full_name,
        is_active = EXCLUDED.is_active;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_admin_account() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS sync_admin_account_trigger ON public.profiles;
CREATE TRIGGER sync_admin_account_trigger
  AFTER INSERT OR UPDATE OF username, full_name, role, is_active ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_admin_account();