DROP POLICY IF EXISTS "Semua pengguna masuk bisa melihat store" ON public.store_settings;
REVOKE ALL ON public.store_settings FROM anon, authenticated;
GRANT ALL ON public.store_settings TO service_role;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.developer_stores FROM anon, authenticated;
GRANT ALL ON public.developer_stores TO service_role;
ALTER TABLE public.developer_stores ENABLE ROW LEVEL SECURITY;