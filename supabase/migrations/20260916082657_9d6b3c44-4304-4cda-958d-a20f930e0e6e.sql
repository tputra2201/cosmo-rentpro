ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS device_code text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS allowed_ips text[] NOT NULL DEFAULT '{}';