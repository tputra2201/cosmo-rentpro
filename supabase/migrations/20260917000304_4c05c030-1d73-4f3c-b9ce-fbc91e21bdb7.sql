ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS allowed_devices jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.stores
SET allowed_devices = jsonb_build_array(jsonb_build_object('code', device_code, 'label', 'Kasir'))
WHERE coalesce(device_code, '') <> ''
  AND (allowed_devices IS NULL OR allowed_devices = '[]'::jsonb);

CREATE OR REPLACE FUNCTION public.store_set_device_access(_device_code text, _allowed_ips text[], _allowed_devices jsonb DEFAULT NULL)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  _allowed boolean;
begin
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role in ('installer'::public.app_role, 'manager'::public.app_role, 'admin'::public.app_role)
  ) into _allowed;

  if not _allowed then
    raise exception 'Hanya Manager, Installer, atau Developer yang boleh mengubah perangkat.';
  end if;

  update public.stores s
  set device_code = coalesce(_device_code, ''),
      allowed_ips = coalesce(_allowed_ips, '{}'::text[]),
      allowed_devices = coalesce(_allowed_devices, s.allowed_devices)
  where s.id in (
    select sm.store_id from public.store_members sm where sm.user_id = auth.uid()
  );
end;
$function$;