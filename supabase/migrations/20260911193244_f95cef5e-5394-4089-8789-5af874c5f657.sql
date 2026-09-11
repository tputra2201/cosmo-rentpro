CREATE TABLE public.developer_stores (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label text NOT NULL DEFAULT '',
  base_url text NOT NULL DEFAULT '',
  control_secret text NOT NULL DEFAULT '',
  store_code text NOT NULL DEFAULT '',
  store_name text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  expires_at timestamp with time zone,
  last_synced_at timestamp with time zone,
  last_status text NOT NULL DEFAULT '',
  note text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT ALL ON public.developer_stores TO service_role;

ALTER TABLE public.developer_stores ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_developer_stores_updated_at
BEFORE UPDATE ON public.developer_stores
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();