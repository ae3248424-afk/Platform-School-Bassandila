/*
# Secure the administrator login lookup

1. New View
- `admin_login_accounts`: exposes only the administrator username and active status needed by the login screen.

2. Access Changes
- Removes direct table reads from browser roles.
- Grants browser roles read access to the limited view only.
- Keeps internal identifiers, names, timestamps, and authentication links private.

3. Security
- The view runs with invoker permissions, so the underlying row-level security policy remains enforced.
- Browser clients still have no write access to administrator data.
*/

CREATE OR REPLACE VIEW public.admin_login_accounts
WITH (security_invoker = true)
AS
SELECT username, is_active
FROM public.admin_accounts;

REVOKE ALL ON public.admin_accounts FROM anon, authenticated;
GRANT SELECT ON public.admin_login_accounts TO anon, authenticated;