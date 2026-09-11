-- 1. Stores
CREATE TABLE public.stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_code text NOT NULL DEFAULT '',
  store_name text NOT NULL DEFAULT '',
  store_email text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  owner_name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  app_version text NOT NULL DEFAULT 'v1.0',
  dev_contact text NOT NULL DEFAULT '',
  note text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '365 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.stores TO authenticated;
GRANT ALL ON public.stores TO service_role;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON public.stores
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Membership
CREATE TABLE public.store_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);
CREATE INDEX store_members_store_idx ON public.store_members(store_id);
GRANT SELECT ON public.store_members TO authenticated;
GRANT ALL ON public.store_members TO service_role;
ALTER TABLE public.store_members ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_store_members_updated_at BEFORE UPDATE ON public.store_members
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Helper: store of the current user
CREATE OR REPLACE FUNCTION app_private.current_store_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT store_id FROM public.store_members WHERE user_id = auth.uid() LIMIT 1
$$;
REVOKE ALL ON FUNCTION app_private.current_store_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_private.current_store_id() TO authenticated, service_role;

CREATE POLICY "Staf melihat store sendiri" ON public.stores
FOR SELECT TO authenticated USING (id = app_private.current_store_id());

CREATE POLICY "Staf melihat anggota store sendiri" ON public.store_members
FOR SELECT TO authenticated USING (store_id = app_private.current_store_id());

-- 4. Data operasional per store
CREATE TABLE public.store_data (
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  kind text NOT NULL,
  entity_id text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (store_id, kind, entity_id)
);
CREATE INDEX store_data_sync_idx ON public.store_data(store_id, updated_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_data TO authenticated;
GRANT ALL ON public.store_data TO service_role;
ALTER TABLE public.store_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staf melihat data store sendiri" ON public.store_data
FOR SELECT TO authenticated USING (store_id = app_private.current_store_id());
CREATE POLICY "Staf menambah data store sendiri" ON public.store_data
FOR INSERT TO authenticated WITH CHECK (store_id = app_private.current_store_id());
CREATE POLICY "Staf mengubah data store sendiri" ON public.store_data
FOR UPDATE TO authenticated USING (store_id = app_private.current_store_id())
WITH CHECK (store_id = app_private.current_store_id());
CREATE POLICY "Staf menghapus data store sendiri" ON public.store_data
FOR DELETE TO authenticated USING (store_id = app_private.current_store_id());

CREATE TRIGGER update_store_data_updated_at BEFORE UPDATE ON public.store_data
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Pindahkan store yang sudah ada + tautkan semua akun
INSERT INTO public.stores (
  store_code, store_name, store_email, address, city, owner_name, phone,
  app_version, dev_contact, expires_at
)
SELECT
  COALESCE(s.store_code, ''), COALESCE(s.store_name, ''), COALESCE(s.store_email, ''),
  COALESCE(s.address, ''), COALESCE(s.city, ''), COALESCE(s.owner_name, ''),
  COALESCE(s.phone, ''), COALESCE(NULLIF(s.app_version, ''), 'v1.0'),
  COALESCE(s.dev_contact, ''), COALESCE(s.expires_at, now() + interval '365 days')
FROM public.store_settings s
LIMIT 1;

INSERT INTO public.stores (store_name, store_code)
SELECT 'Store Utama', 'STORE-1'
WHERE NOT EXISTS (SELECT 1 FROM public.stores);

INSERT INTO public.store_members (store_id, user_id)
SELECT (SELECT id FROM public.stores ORDER BY created_at LIMIT 1), u.id
FROM auth.users u
ON CONFLICT (user_id) DO NOTHING;