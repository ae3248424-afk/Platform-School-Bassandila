/*
# Create a dedicated admin accounts table

1. New Tables
- `admin_accounts`
- `id`: internal identifier.
- `auth_user_id`: linked Supabase Auth account; the password remains managed and encrypted by Supabase Auth.
- `username`: unique administrator login name.
- `full_name`: administrator display name.
- `is_active`: whether this administrator may sign in.
- `created_at`: creation timestamp.

2. Data Migration
- Copies the existing administrator usernames and names from `profiles`.
- Keeps the existing authentication accounts and passwords unchanged.

3. Security
- Enables row-level security.
- Allows only the minimum username and active-status lookup needed before login.
- Does not grant browser write access, so administrator records cannot be forged from the client.
- The password is intentionally not stored in this table; Supabase Auth stores and verifies it securely.

4. Important Notes
- The application uses `admin_accounts` only for administrator login lookup.
- Existing student, teacher, and parent login records remain in `profiles`.
*/

CREATE TABLE IF NOT EXISTS public.admin_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL UNIQUE,
  full_name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS admin_accounts_username_lower_key
  ON public.admin_accounts (lower(username));

ALTER TABLE public.admin_accounts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.admin_accounts FROM anon, authenticated;
GRANT SELECT (username, is_active) ON public.admin_accounts TO anon, authenticated;

DROP POLICY IF EXISTS "anon_lookup_admin_accounts" ON public.admin_accounts;
CREATE POLICY "anon_lookup_admin_accounts"
  ON public.admin_accounts FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

INSERT INTO public.admin_accounts (auth_user_id, username, full_name, is_active)
SELECT id, username, trim(full_name), is_active
FROM public.profiles
WHERE role = 'admin'
  AND username IS NOT NULL
ON CONFLICT (auth_user_id) DO UPDATE
SET username = EXCLUDED.username,
    full_name = EXCLUDED.full_name,
    is_active = EXCLUDED.is_active;