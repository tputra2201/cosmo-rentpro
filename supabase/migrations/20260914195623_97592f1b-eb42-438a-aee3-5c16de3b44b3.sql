ALTER TABLE public.app_branding
  ADD COLUMN IF NOT EXISTS app_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS app_version text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS release_date text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS developer_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS developer_email text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS developer_contact text NOT NULL DEFAULT '';