-- Lock down developer_stores and store_settings from the Data API entirely.
REVOKE ALL ON public.developer_stores FROM anon, authenticated;
REVOKE ALL ON public.store_settings FROM anon, authenticated;
GRANT ALL ON public.developer_stores TO service_role;
GRANT ALL ON public.store_settings TO service_role;

ALTER TABLE public.developer_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.developer_stores FORCE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No client access to developer stores" ON public.developer_stores;
CREATE POLICY "No client access to developer stores"
ON public.developer_stores FOR ALL TO anon, authenticated
USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "No client access to store settings" ON public.store_settings;
CREATE POLICY "No client access to store settings"
ON public.store_settings FOR ALL TO anon, authenticated
USING (false) WITH CHECK (false);

-- Branding: only the single public 'default' row is readable, nothing else.
DROP POLICY IF EXISTS "Anyone can view branding" ON public.app_branding;
CREATE POLICY "Anyone can view default branding"
ON public.app_branding FOR SELECT TO anon, authenticated
USING (id = 'default');

REVOKE ALL ON public.app_branding FROM anon, authenticated;
GRANT SELECT (id, logo_url, login_title, login_note) ON public.app_branding TO anon, authenticated;
GRANT ALL ON public.app_branding TO service_role;