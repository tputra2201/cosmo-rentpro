ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS app_version text NOT NULL DEFAULT 'v1.0',
  ADD COLUMN IF NOT EXISTS dev_contact text NOT NULL DEFAULT '';