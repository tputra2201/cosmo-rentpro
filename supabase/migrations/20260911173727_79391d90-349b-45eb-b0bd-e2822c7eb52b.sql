CREATE TABLE public.store_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE CHECK (singleton),
  store_code text NOT NULL DEFAULT '',
  store_name text NOT NULL DEFAULT '',
  store_email text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  owner_name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.store_settings TO authenticated;
GRANT ALL ON public.store_settings TO service_role;

ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Semua pengguna masuk bisa melihat store"
ON public.store_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Installer bisa membuat store"
ON public.store_settings FOR INSERT TO authenticated
WITH CHECK (app_private.has_role(auth.uid(), 'installer'::public.app_role));

CREATE POLICY "Installer bisa mengubah store"
ON public.store_settings FOR UPDATE TO authenticated
USING (app_private.has_role(auth.uid(), 'installer'::public.app_role))
WITH CHECK (app_private.has_role(auth.uid(), 'installer'::public.app_role));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_store_settings_updated_at
BEFORE UPDATE ON public.store_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.store_settings (singleton) VALUES (true) ON CONFLICT DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT ur.user_id, 'installer'::public.app_role
FROM public.user_roles ur
WHERE ur.role = 'admin'::public.app_role
ORDER BY ur.created_at
LIMIT 1
ON CONFLICT (user_id, role) DO NOTHING;