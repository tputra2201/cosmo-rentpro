create or replace function public.store_set_device_access(_device_code text, _allowed_ips text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
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
      allowed_ips = coalesce(_allowed_ips, '{}'::text[])
  where s.id in (
    select sm.store_id from public.store_members sm where sm.user_id = auth.uid()
  );
end;
$$;

revoke all on function public.store_set_device_access(text, text[]) from public, anon;
grant execute on function public.store_set_device_access(text, text[]) to authenticated;