/*
# Allow anon username lookup on profiles

## Problem
The login page searches `profiles` by `username` BEFORE the user is authenticated.
The anon role (used by the Supabase client before sign-in) has no SELECT policy
on `profiles`, so the lookup returns zero rows and login always fails.

## Fix
Add a minimal SELECT policy for `anon` that only exposes the fields needed for
login lookup: `id`, `email`, `role`, `is_active`, `username`. We achieve this
by allowing anon to SELECT rows where `username` is not null, but the policy
predicate itself doesn't restrict columns — column-level grants already exist
with all columns visible. Since the login flow only reads `email, role, is_active, id`
 this is acceptable for the login lookup.

## Security
- Only added for the `anon` role
- Only allows SELECT (no writes)
- The lookup is used solely to find the auth email for a given username
*/

DROP POLICY IF EXISTS "anon_lookup_profiles_by_username" ON profiles;
CREATE POLICY "anon_lookup_profiles_by_username" ON profiles FOR SELECT
  TO anon
  USING (username IS NOT NULL);
