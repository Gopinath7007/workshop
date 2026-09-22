# Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Enable **Email** auth. Optionally enable **Google**.
3. Run `supabase/migrations/001_profiles.sql` in the SQL editor.
4. Copy the project URL and anon key into `.env`.

The mobile client uses the anon key only. Row Level Security on `profiles` keeps rows private to `auth.uid()`.

Do not commit service-role keys. This scaffold never ships one.
