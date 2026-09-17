drop function if exists public.store_set_device_access(text, text[], jsonb);

create function public.store_set_device_access(_device_code text, _allowed_ips text[], _allowed_devices jsonb default null::jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  _allowed boolean;
  _count integer;
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

  get diagnostics _count = row_count;
  return _count;
end;
$$;