CREATE OR REPLACE FUNCTION public.create_customer_call(
  p_restaurant_slug text,
  p_table_number integer,
  p_detail text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target_restaurant_id uuid;
  new_call_id uuid;
BEGIN
  IF p_table_number IS NULL OR p_table_number < 1 OR p_table_number > 200 THEN
    RAISE EXCEPTION 'Número de mesa inválido.';
  END IF;

  IF p_detail NOT IN ('Chamou o garçom', 'Solicitou a conta') THEN
    RAISE EXCEPTION 'Tipo de chamado inválido.';
  END IF;

  SELECT r.id
    INTO target_restaurant_id
    FROM public.restaurants AS r
   WHERE r.slug = lower(trim(p_restaurant_slug))
     AND r.status = 'active';

  IF target_restaurant_id IS NULL THEN
    RAISE EXCEPTION 'Restaurante não encontrado ou inativo.';
  END IF;

  INSERT INTO public.calls (restaurant_id, table_number, detail, priority, status)
  VALUES (target_restaurant_id, p_table_number, p_detail, 'normal', 'pending')
  RETURNING id INTO new_call_id;

  RETURN new_call_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_customer_call(text, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_customer_call(text, integer, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_customer_rating(
  p_restaurant_slug text,
  p_table_number integer,
  p_score integer,
  p_comment text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target_restaurant_id uuid;
  new_rating_id uuid;
BEGIN
  IF p_table_number IS NULL OR p_table_number < 1 OR p_table_number > 200 THEN
    RAISE EXCEPTION 'Número de mesa inválido.';
  END IF;

  IF p_score IS NULL OR p_score < 1 OR p_score > 5 THEN
    RAISE EXCEPTION 'A avaliação deve ter entre 1 e 5 estrelas.';
  END IF;

  IF p_comment IS NOT NULL AND char_length(p_comment) > 1000 THEN
    RAISE EXCEPTION 'O comentário deve ter no máximo 1000 caracteres.';
  END IF;

  SELECT r.id
    INTO target_restaurant_id
    FROM public.restaurants AS r
   WHERE r.slug = lower(trim(p_restaurant_slug))
     AND r.status = 'active';

  IF target_restaurant_id IS NULL THEN
    RAISE EXCEPTION 'Restaurante não encontrado ou inativo.';
  END IF;

  INSERT INTO public.ratings (restaurant_id, table_number, score, comment)
  VALUES (
    target_restaurant_id,
    p_table_number,
    p_score,
    nullif(trim(p_comment), '')
  )
  RETURNING id INTO new_rating_id;

  RETURN new_rating_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_customer_rating(text, integer, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_customer_rating(text, integer, integer, text) TO anon, authenticated;

ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'Destaques',
  ADD COLUMN IF NOT EXISTS reel_url text,
  ADD COLUMN IF NOT EXISTS promotional_price numeric(10,2),
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS media_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS category_id uuid;

CREATE TABLE IF NOT EXISTS public.menu_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, name)
);

ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Restaurant members can view menu categories" ON public.menu_categories;
CREATE POLICY "Restaurant members can view menu categories"
ON public.menu_categories FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles AS p
    WHERE p.id = auth.uid()
      AND p.restaurant_id = menu_categories.restaurant_id
  )
);

DROP POLICY IF EXISTS "Restaurant members can manage menu categories" ON public.menu_categories;
CREATE POLICY "Restaurant members can manage menu categories"
ON public.menu_categories FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles AS p
    WHERE p.id = auth.uid()
      AND p.restaurant_id = menu_categories.restaurant_id
      AND p.role IN ('admin', 'user')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles AS p
    WHERE p.id = auth.uid()
      AND p.restaurant_id = menu_categories.restaurant_id
      AND p.role IN ('admin', 'user')
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.menu_categories TO authenticated;

INSERT INTO public.menu_categories (restaurant_id, name)
SELECT DISTINCT mi.restaurant_id, trim(mi.category)
FROM public.menu_items AS mi
WHERE nullif(trim(mi.category), '') IS NOT NULL
ON CONFLICT (restaurant_id, name) DO NOTHING;

UPDATE public.menu_items AS mi
SET category_id = mc.id
FROM public.menu_categories AS mc
WHERE mc.restaurant_id = mi.restaurant_id
  AND mc.name = mi.category
  AND mi.category_id IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'menu_items_category_id_fkey'
      AND conrelid = 'public.menu_items'::regclass
  ) THEN
    ALTER TABLE public.menu_items
      ADD CONSTRAINT menu_items_category_id_fkey
      FOREIGN KEY (category_id) REFERENCES public.menu_categories(id) ON DELETE SET NULL;
  END IF;
END;
$$;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('menu-media', 'menu-media', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime'])
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Restaurant members can upload menu media" ON storage.objects;
CREATE POLICY "Restaurant members can upload menu media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'menu-media'
  AND (storage.foldername(name))[1] = (
    SELECT p.restaurant_id::text FROM public.profiles AS p WHERE p.id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Restaurant members can update menu media" ON storage.objects;
CREATE POLICY "Restaurant members can update menu media"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'menu-media'
  AND (storage.foldername(name))[1] = (
    SELECT p.restaurant_id::text FROM public.profiles AS p WHERE p.id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'menu-media'
  AND (storage.foldername(name))[1] = (
    SELECT p.restaurant_id::text FROM public.profiles AS p WHERE p.id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Restaurant members can delete menu media" ON storage.objects;
CREATE POLICY "Restaurant members can delete menu media"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'menu-media'
  AND (storage.foldername(name))[1] = (
    SELECT p.restaurant_id::text FROM public.profiles AS p WHERE p.id = auth.uid()
  )
);

CREATE OR REPLACE FUNCTION public.get_customer_menu(p_restaurant_slug text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'restaurant_name', r.name,
    'restaurant_logo_url', rs.logo_url,
    'restaurant_cover_image_url', rs.cover_image_url,
    'primary_color', COALESCE(rs.primary_color, '#0a0a0a'),
    'social_links', jsonb_build_object(
      'instagram', jsonb_build_object('enabled', COALESCE(rs.social_instagram_enabled, false), 'url', rs.social_instagram_url),
      'tiktok', jsonb_build_object('enabled', COALESCE(rs.social_tiktok_enabled, false), 'url', rs.social_tiktok_url),
      'facebook', jsonb_build_object('enabled', COALESCE(rs.social_facebook_enabled, false), 'url', rs.social_facebook_url),
      'google', jsonb_build_object('enabled', COALESCE(rs.social_google_enabled, false), 'url', rs.social_google_url)
    ),
    'categories', COALESCE((
      SELECT jsonb_agg(mc.name ORDER BY mc.position, mc.name)
      FROM public.menu_categories AS mc
      WHERE mc.restaurant_id = r.id
    ), '[]'::jsonb),
    'items', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', mi.id,
          'name', mi.name,
          'description', mi.description,
          'price', mi.price,
          'promotional_price', mi.promotional_price,
          'currency', mi.currency,
          'image_url', mi.image_url,
          'reel_url', mi.reel_url,
          'video_url', mi.video_url,
          'media_items', CASE
            WHEN jsonb_typeof(mi.media_items) = 'array' AND jsonb_array_length(mi.media_items) > 0
              THEN mi.media_items
            ELSE
              CASE WHEN mi.image_url IS NOT NULL
                THEN jsonb_build_array(jsonb_build_object('type', 'image', 'url', mi.image_url))
                ELSE '[]'::jsonb
              END
              ||
              CASE WHEN mi.video_url IS NOT NULL
                THEN jsonb_build_array(jsonb_build_object('type', 'video', 'url', mi.video_url))
                ELSE '[]'::jsonb
              END
          END,
          'category', COALESCE(mc.name, mi.category),
          'tags', mi.tags,
          'is_featured', mi.is_featured
        )
        ORDER BY mi.position, mi.created_at
      )
      FROM public.menu_items AS mi
      LEFT JOIN public.menu_categories AS mc
        ON mc.id = mi.category_id
      WHERE mi.restaurant_id = r.id
        AND mi.status = 'active'
    ), '[]'::jsonb)
  )
  FROM public.restaurants AS r
  LEFT JOIN public.restaurant_settings AS rs
    ON rs.restaurant_id = r.id
  WHERE r.slug = lower(trim(p_restaurant_slug))
    AND r.status = 'active';
$$;

REVOKE ALL ON FUNCTION public.get_customer_menu(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_customer_menu(text) TO anon, authenticated;
