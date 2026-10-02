-- ============================================================
-- TapServe - Supabase Database Schema
-- ============================================================
-- Objetivo:
-- 1) autenticação via auth.users do Supabase
-- 2) perfil do usuário e relacionamento com restaurante
-- 3) gestão de mesas, cardápio, chamados, avaliações e configurações
-- 4) controles de segurança com RLS (Row Level Security)
-- ============================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- Enums
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role' AND typnamespace = 'public'::regnamespace) THEN
        CREATE TYPE public.user_role AS ENUM ('admin', 'user');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'table_status' AND typnamespace = 'public'::regnamespace) THEN
        CREATE TYPE public.table_status AS ENUM ('available', 'occupied', 'reserved', 'maintenance');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'call_priority' AND typnamespace = 'public'::regnamespace) THEN
        CREATE TYPE public.call_priority AS ENUM ('normal', 'urgent');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type' AND typnamespace = 'public'::regnamespace) THEN
        CREATE TYPE public.notification_type AS ENUM ('call', 'rating', 'system');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'menu_item_status' AND typnamespace = 'public'::regnamespace) THEN
        CREATE TYPE public.menu_item_status AS ENUM ('active', 'paused');
    END IF;
END $$;

-- ============================================================
-- 1) Perfis e organização
-- ============================================================
CREATE TABLE public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name text NOT NULL,
    email text NOT NULL UNIQUE,
    phone text,
    avatar_url text,
    role public.user_role NOT NULL DEFAULT 'user',
    restaurant_id uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.restaurants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    slug text NOT NULL UNIQUE,
    address text,
    city text,
    phone text,
    email text,
    status text NOT NULL DEFAULT 'active',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_restaurant_id_fkey
    FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE SET NULL;

CREATE TABLE public.restaurant_units (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name text NOT NULL,
    location text,
    timezone text DEFAULT 'Africa/Luanda',
    is_main boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 2) Mesas e acesso do cliente
-- ============================================================
CREATE TABLE public.restaurant_tables (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    unit_id uuid REFERENCES public.restaurant_units(id) ON DELETE SET NULL,
    table_number integer NOT NULL,
    status public.table_status NOT NULL DEFAULT 'available',
    qr_code_url text,
    nfc_tag text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(restaurant_id, unit_id, table_number)
);

CREATE TABLE public.table_access_links (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    table_id uuid NOT NULL REFERENCES public.restaurant_tables(id) ON DELETE CASCADE,
    slug text NOT NULL UNIQUE,
    url text NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 3) Cardápio e conteúdos
-- ============================================================
CREATE TABLE public.menu_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    price numeric(10,2) NOT NULL DEFAULT 0,
    currency text NOT NULL DEFAULT 'Kz',
    status public.menu_item_status NOT NULL DEFAULT 'active',
    image_url text,
    position integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.menu_pdfs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    file_name text NOT NULL,
    storage_path text NOT NULL,
    public_url text,
    is_published boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 4) Chamados de atendimento e avaliações
-- ============================================================
CREATE TABLE public.calls (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    table_id uuid REFERENCES public.restaurant_tables(id) ON DELETE SET NULL,
    table_number integer,
    detail text NOT NULL,
    priority public.call_priority NOT NULL DEFAULT 'normal',
    status text NOT NULL DEFAULT 'pending',
    created_at timestamptz NOT NULL DEFAULT now(),
    resolved_at timestamptz,
    resolved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE TABLE public.ratings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    table_id uuid REFERENCES public.restaurant_tables(id) ON DELETE SET NULL,
    table_number integer,
    score integer NOT NULL CHECK (score BETWEEN 1 AND 5),
    comment text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 5) Configurações e notificações
-- ============================================================
CREATE TABLE public.restaurant_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    admin_name text,
    restaurant_name text,
    unit_name text,
    address text,
    phone text,
    default_table_count integer NOT NULL DEFAULT 12,
    enable_sound_alerts boolean NOT NULL DEFAULT true,
    highlight_after_minutes integer NOT NULL DEFAULT 5,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(restaurant_id)
);

CREATE TABLE public.notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    type public.notification_type NOT NULL DEFAULT 'call',
    title text NOT NULL,
    message text NOT NULL,
    is_read boolean NOT NULL DEFAULT false,
    metadata jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.platform_settings (
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

INSERT INTO public.platform_settings (id)
VALUES (true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 6) Logs e auditoria
-- ============================================================
CREATE TABLE public.audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE SET NULL,
    user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid,
    metadata jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 7) Funções de suporte
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email, role)
    VALUES (
        NEW.id,
        COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''), 'Usuário'),
        NEW.email,
        'user'::public.user_role
    )
    ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        email = EXCLUDED.email;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.current_profile_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT role
    FROM public.profiles
    WHERE id = auth.uid();
$$;

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

CREATE OR REPLACE FUNCTION public.user_restaurant_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT restaurant_id
    FROM public.profiles
    WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_user(rest_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.restaurant_id = rest_id
          AND p.role IN ('admin', 'user')
    );
$$;

CREATE OR REPLACE FUNCTION public.is_restaurant_member(rest_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.restaurant_id = rest_id
    );
$$;

-- ============================================================
-- 8) Triggers de updated_at
-- ============================================================
CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_restaurants_updated_at
BEFORE UPDATE ON public.restaurants
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_units_updated_at
BEFORE UPDATE ON public.restaurant_units
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_tables_updated_at
BEFORE UPDATE ON public.restaurant_tables
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_menu_items_updated_at
BEFORE UPDATE ON public.menu_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_menu_pdfs_updated_at
BEFORE UPDATE ON public.menu_pdfs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_settings_updated_at
BEFORE UPDATE ON public.restaurant_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- 9) Trigger de criação automática do perfil no auth.users
-- ============================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 10) Row Level Security (RLS)
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.table_access_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_pdfs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 11) Policies
-- ============================================================
-- profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins and users can manage restaurant profiles" ON public.profiles;
DROP POLICY IF EXISTS "Platform admins can manage profiles" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id AND role = public.current_profile_role());

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

-- restaurants
CREATE POLICY "Members can view their restaurant"
ON public.restaurants FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.restaurant_id = restaurants.id
    )
);

CREATE POLICY "Admins and users can edit restaurant"
ON public.restaurants FOR UPDATE
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.restaurant_id = restaurants.id
          AND p.role IN ('admin', 'user')
    )
);

CREATE POLICY "Admins and users can insert restaurant"
ON public.restaurants FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.restaurant_id = restaurants.id
          AND p.role IN ('admin', 'user')
    )
);

-- restaurant_units
CREATE POLICY "Restaurant members can view units"
ON public.restaurant_units FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.restaurant_id = restaurant_units.restaurant_id
    )
);

CREATE POLICY "Admins and users can manage units"
ON public.restaurant_units FOR ALL
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.restaurant_id = restaurant_units.restaurant_id
          AND p.role IN ('admin', 'user')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.restaurant_id = restaurant_units.restaurant_id
          AND p.role IN ('admin', 'user')
    )
);

-- restaurant_tables
CREATE POLICY "Restaurant members can view tables"
ON public.restaurant_tables FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.restaurant_id = restaurant_tables.restaurant_id
    )
);

CREATE POLICY "Admins and users can manage tables"
ON public.restaurant_tables FOR ALL
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.restaurant_id = restaurant_tables.restaurant_id
          AND p.role IN ('admin', 'user')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.restaurant_id = restaurant_tables.restaurant_id
          AND p.role IN ('admin', 'user')
    )
);

-- table_access_links
CREATE POLICY "Restaurant members can view access links"
ON public.table_access_links FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.restaurant_id = table_access_links.restaurant_id
    )
);

CREATE POLICY "Admins and users can manage access links"
ON public.table_access_links FOR ALL
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.restaurant_id = table_access_links.restaurant_id
          AND p.role IN ('admin', 'user')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.restaurant_id = table_access_links.restaurant_id
          AND p.role IN ('admin', 'user')
    )
);

-- menu_items
CREATE POLICY "Restaurant members can view menu items"
ON public.menu_items FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.restaurant_id = menu_items.restaurant_id
    )
);

CREATE POLICY "Admins and users can edit menu"
ON public.menu_items FOR ALL
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.restaurant_id = menu_items.restaurant_id
          AND p.role IN ('admin', 'user')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.restaurant_id = menu_items.restaurant_id
          AND p.role IN ('admin', 'user')
    )
);

-- menu_pdfs
CREATE POLICY "Restaurant members can view pdfs"
ON public.menu_pdfs FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.restaurant_id = menu_pdfs.restaurant_id
    )
);

CREATE POLICY "Admins and users can edit pdfs"
ON public.menu_pdfs FOR ALL
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.restaurant_id = menu_pdfs.restaurant_id
          AND p.role IN ('admin', 'user')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.restaurant_id = menu_pdfs.restaurant_id
          AND p.role IN ('admin', 'user')
    )
);

-- calls
CREATE POLICY "Restaurant members can view calls"
ON public.calls FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.restaurant_id = calls.restaurant_id
    )
);

CREATE POLICY "Restaurant members can create and update calls"
ON public.calls FOR ALL
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.restaurant_id = calls.restaurant_id
          AND p.role IN ('admin', 'user')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.restaurant_id = calls.restaurant_id
          AND p.role IN ('admin', 'user')
    )
);

-- ratings
CREATE POLICY "Restaurant members can view ratings"
ON public.ratings FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.restaurant_id = ratings.restaurant_id
    )
);

CREATE POLICY "Anyone with access can insert rating"
ON public.ratings FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.restaurant_id = ratings.restaurant_id
    )
);

-- restaurant settings
CREATE POLICY "Members can view settings"
ON public.restaurant_settings FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.restaurant_id = restaurant_settings.restaurant_id
    )
);

CREATE POLICY "Admins and users can manage settings"
ON public.restaurant_settings FOR ALL
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.restaurant_id = restaurant_settings.restaurant_id
          AND p.role IN ('admin', 'user')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.restaurant_id = restaurant_settings.restaurant_id
          AND p.role IN ('admin', 'user')
    )
);

-- notifications
CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT
USING (
    auth.uid() = user_id
    OR EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.restaurant_id = notifications.restaurant_id
          AND p.role IN ('admin', 'user')
    )
);

CREATE POLICY "Admins and users can create notifications"
ON public.notifications FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.restaurant_id = notifications.restaurant_id
          AND p.role IN ('admin', 'user')
    )
);

CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
USING (
    auth.uid() = user_id
    OR EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.restaurant_id = notifications.restaurant_id
          AND p.role IN ('admin', 'user')
    )
);

-- audit logs
CREATE POLICY "Admins and users can view audit logs"
ON public.audit_logs FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.restaurant_id = audit_logs.restaurant_id
          AND p.role IN ('admin', 'user')
    )
);

CREATE POLICY "Admins and users can create audit logs"
ON public.audit_logs FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.restaurant_id = audit_logs.restaurant_id
          AND p.role IN ('admin', 'user')
    )
);

-- ============================================================
-- 12) Índices para performance
-- ============================================================
CREATE INDEX idx_profiles_restaurant_id ON public.profiles(restaurant_id);
CREATE INDEX idx_restaurant_units_restaurant_id ON public.restaurant_units(restaurant_id);
CREATE INDEX idx_tables_restaurant_id ON public.restaurant_tables(restaurant_id);
CREATE INDEX idx_table_access_links_table_id ON public.table_access_links(table_id);
CREATE INDEX idx_menu_items_restaurant_id ON public.menu_items(restaurant_id);
CREATE INDEX idx_calls_restaurant_id ON public.calls(restaurant_id);
CREATE INDEX idx_ratings_restaurant_id ON public.ratings(restaurant_id);
CREATE INDEX idx_notifications_restaurant_id ON public.notifications(restaurant_id);
CREATE INDEX idx_audit_logs_restaurant_id ON public.audit_logs(restaurant_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- ============================================================
-- 13) Dados iniciais
-- ============================================================
-- Nenhum dado mockado deve ser inserido aqui.
-- O restaurante, configurações e perfis reais devem ser criados
-- apenas no painel administrativo ou via fluxo autenticado do app.

COMMIT;
