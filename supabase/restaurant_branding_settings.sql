ALTER TABLE public.restaurant_settings
  ADD COLUMN IF NOT EXISTS cover_image_url text,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS primary_color text NOT NULL DEFAULT '#0a0a0a',
  ADD COLUMN IF NOT EXISTS social_instagram_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS social_instagram_url text,
  ADD COLUMN IF NOT EXISTS social_tiktok_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS social_tiktok_url text,
  ADD COLUMN IF NOT EXISTS social_facebook_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS social_facebook_url text,
  ADD COLUMN IF NOT EXISTS social_google_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS social_google_url text;
