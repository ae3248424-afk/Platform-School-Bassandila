/*
# Fix administrator login lookup permissions

1. Access Fix
- Allows the browser data API to query `admin_accounts`.
- Keeps only `username` and `is_active` readable by anonymous and signed-in clients.

2. Protected Columns
- Keeps the internal id, authentication user id, full name, and timestamps hidden from the browser.
- No password is stored in this table.

3. Security
- Row-level security remains enabled and still limits results to active administrator accounts.
- Browser clients receive no write permissions.
*/

GRANT SELECT ON public.admin_accounts TO anon, authenticated;
REVOKE SELECT (id, auth_user_id, full_name, created_at)
  ON public.admin_accounts FROM anon, authenticated;