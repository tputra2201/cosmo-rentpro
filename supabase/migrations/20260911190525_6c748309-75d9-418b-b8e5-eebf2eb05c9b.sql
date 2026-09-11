ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS expires_at timestamptz NOT NULL DEFAULT (now() + interval '365 days');

DROP POLICY IF EXISTS "Installer bisa membuat store" ON public.store_settings;
DROP POLICY IF EXISTS "Installer bisa mengubah store" ON public.store_settings;

REVOKE INSERT, UPDATE, DELETE ON public.store_settings FROM authenticated;
GRANT SELECT ON public.store_settings TO authenticated;
GRANT ALL ON public.store_settings TO service_role;

INSERT INTO public.store_settings (singleton)
SELECT true
WHERE NOT EXISTS (SELECT 1 FROM public.store_settings);