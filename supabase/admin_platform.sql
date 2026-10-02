-- Admin dashboard objects and permissions for an existing TapServe project.
-- Run after schema.sql and fix_auth_signup.sql in the Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS public.platform_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  platform_name text NOT NULL DEFAULT 'TapServe',
  country text NOT NULL DEFAULT 'Angola',
  currency text NOT NULL DEFAULT 'Kz',
  support_whatsapp text NOT NULL DEFAULT '',
  automatic_alerts boolean NOT NULL DEFAULT true,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_restaurant_id_fkey'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_restaurant_id_fkey
      FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE SET NULL;
  END IF;
END;
$$;

INSERT INTO public.platform_settings (id)
VALUES (true)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'::public.user_role
  );
$$;

DROP POLICY IF EXISTS "Platform admins can manage profiles" ON public.profiles;
CREATE POLICY "Platform admins can manage profiles"
ON public.profiles FOR ALL
USING (public.is_platform_admin())
WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "Platform admins can manage restaurants" ON public.restaurants;
CREATE POLICY "Platform admins can manage restaurants"
ON public.restaurants FOR ALL
USING (public.is_platform_admin())
WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "Platform admins can view calls" ON public.calls;
CREATE POLICY "Platform admins can view calls"
ON public.calls FOR SELECT
USING (public.is_platform_admin());

DROP POLICY IF EXISTS "Platform admins can view ratings" ON public.ratings;
CREATE POLICY "Platform admins can view ratings"
ON public.ratings FOR SELECT
USING (public.is_platform_admin());

DROP POLICY IF EXISTS "Platform admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Platform admins can view audit logs"
ON public.audit_logs FOR SELECT
USING (public.is_platform_admin());

DROP POLICY IF EXISTS "Platform admins can create audit logs" ON public.audit_logs;
CREATE POLICY "Platform admins can create audit logs"
ON public.audit_logs FOR INSERT
WITH CHECK (public.is_platform_admin() AND user_id = auth.uid());

DROP POLICY IF EXISTS "Platform admins can manage platform settings" ON public.platform_settings;
CREATE POLICY "Platform admins can manage platform settings"
ON public.platform_settings FOR ALL
USING (public.is_platform_admin())
WITH CHECK (public.is_platform_admin());

GRANT SELECT, INSERT, UPDATE ON public.profiles, public.restaurants, public.calls, public.ratings, public.audit_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.platform_settings TO authenticated;

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);