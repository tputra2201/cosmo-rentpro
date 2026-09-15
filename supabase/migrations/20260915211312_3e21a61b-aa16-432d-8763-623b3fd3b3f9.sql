ALTER TABLE public.app_branding ADD COLUMN IF NOT EXISTS app_icon_url text NOT NULL DEFAULT '';
GRANT SELECT (app_icon_url) ON public.app_branding TO anon, authenticated;