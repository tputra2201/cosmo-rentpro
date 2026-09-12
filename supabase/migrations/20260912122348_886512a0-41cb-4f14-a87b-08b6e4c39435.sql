CREATE TABLE public.app_branding (
  id text PRIMARY KEY DEFAULT 'default',
  logo_url text NOT NULL DEFAULT '',
  login_title text NOT NULL DEFAULT 'BILLING RENTAL PS',
  login_note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.app_branding TO anon;
GRANT SELECT ON public.app_branding TO authenticated;
GRANT ALL ON public.app_branding TO service_role;

ALTER TABLE public.app_branding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view branding" ON public.app_branding FOR SELECT TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_app_branding_updated_at BEFORE UPDATE ON public.app_branding FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.app_branding (id, login_title, login_note) VALUES ('default', 'BILLING RENTAL PS', 'Tidak ada pendaftaran mandiri. Admin mengirim undangan ke email kamu, lalu kamu membuat kata sandi sendiri lewat tautan di email itu. Lupa sandi? Minta Admin mengirim tautan atur ulang.');