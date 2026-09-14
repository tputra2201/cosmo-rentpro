CREATE TABLE public.user_presence (
  user_id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  device text NOT NULL DEFAULT ''
);

GRANT SELECT ON public.user_presence TO authenticated;
GRANT ALL ON public.user_presence TO service_role;

ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staf melihat kehadiran store sendiri"
ON public.user_presence FOR SELECT TO authenticated
USING (store_id = app_private.current_store_id() OR user_id = auth.uid());

CREATE POLICY "No client writes to user presence"
ON public.user_presence FOR ALL TO anon, authenticated
USING (false) WITH CHECK (false);

CREATE INDEX user_presence_store_seen_idx ON public.user_presence (store_id, last_seen_at DESC);