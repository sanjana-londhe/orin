-- Enable Row Level Security on public.tasks and add per-user policies.
--
-- This is a backstop. Prisma connects with a role (postgres) that
-- bypasses RLS, so server-side reads/writes are still gated by
-- application-level userId checks. RLS here protects against:
--   1. Direct Supabase JS / PostgREST access using an anon or auth'd JWT.
--   2. A future query under a non-bypass role that forgets the user filter.
--   3. A future migration off Prisma.

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners select their tasks" ON public.tasks;
CREATE POLICY "Owners select their tasks"
  ON public.tasks
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owners insert their tasks" ON public.tasks;
CREATE POLICY "Owners insert their tasks"
  ON public.tasks
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owners update their tasks" ON public.tasks;
CREATE POLICY "Owners update their tasks"
  ON public.tasks
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owners delete their tasks" ON public.tasks;
CREATE POLICY "Owners delete their tasks"
  ON public.tasks
  FOR DELETE
  USING (auth.uid() = user_id);
