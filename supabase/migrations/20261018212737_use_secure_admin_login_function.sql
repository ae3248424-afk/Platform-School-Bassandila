/*
# Use a secure function for administrator login lookup

1. Database Function
- Adds `lookup_admin_login` to return only an active administrator username and status.
- The function runs with a fixed search path and returns no internal identifiers.

2. Access Changes
- Anonymous and signed-in browser roles may execute only this narrow lookup.
- Direct table access remains disabled.

3. Security
- The function exposes only the login fields required by the screen.
- Administrator records remain non-writable from the browser.
- Password verification continues through Supabase Auth.
*/

CREATE OR REPLACE FUNCTION public.lookup_admin_login(p_username text)
RETURNS TABLE (username text, is_active boolean)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.username, a.is_active
  FROM public.admin_accounts AS a
  WHERE a.is_active = true
    AND lower(trim(a.username)) = lower(trim(p_username))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.lookup_admin_login(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_admin_login(text) TO anon, authenticated;