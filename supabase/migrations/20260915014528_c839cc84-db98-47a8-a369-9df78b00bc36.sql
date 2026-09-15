
create or replace function public.developer_is_developer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.developer_accounts d where d.user_id = auth.uid());
$$;

create or replace function public.developer_list_stores()
returns table (
  id uuid,
  store_code text,
  store_name text,
  city text,
  active boolean,
  expires_at timestamptz,
  current_store_id uuid
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.developer_is_developer() then
    raise exception 'Hanya akun Developer yang boleh melihat daftar store.';
  end if;
  return query
    select s.id, s.store_code, s.store_name, s.city, s.active, s.expires_at,
           (select m.store_id from public.store_members m where m.user_id = auth.uid() limit 1)
    from public.stores s
    order by s.store_name;
end;
$$;

create or replace function public.developer_switch_store(_store_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if not public.developer_is_developer() then
    raise exception 'Hanya akun Developer yang boleh berpindah store.';
  end if;
  if not exists (select 1 from public.stores s where s.id = _store_id) then
    raise exception 'Store tidak ditemukan.';
  end if;
  if exists (select 1 from public.store_members m where m.user_id = v_uid) then
    update public.store_members set store_id = _store_id where user_id = v_uid;
  else
    insert into public.store_members (user_id, store_id) values (v_uid, _store_id);
  end if;
  return _store_id;
end;
$$;

revoke all on function public.developer_is_developer() from anon;
revoke all on function public.developer_list_stores() from anon;
revoke all on function public.developer_switch_store(uuid) from anon;
grant execute on function public.developer_is_developer() to authenticated;
grant execute on function public.developer_list_stores() to authenticated;
grant execute on function public.developer_switch_store(uuid) to authenticated;
