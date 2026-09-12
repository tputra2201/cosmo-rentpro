CREATE TABLE public.developer_accounts (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL DEFAULT '',
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.developer_accounts TO authenticated;
GRANT ALL ON public.developer_accounts TO service_role;

ALTER TABLE public.developer_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Developer melihat barisnya sendiri"
ON public.developer_accounts
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE TRIGGER update_developer_accounts_updated_at
BEFORE UPDATE ON public.developer_accounts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION app_private.is_developer(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, app_private
AS $$
  SELECT EXISTS (SELECT 1 FROM public.developer_accounts WHERE user_id = _user_id)
$$;