create or replace function public.guard_closed_records()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if new.kind in ('shift','business_day')
     and (old.payload ? 'closedAt') and old.payload->>'closedAt' is not null
     and (new.payload->>'closedAt') is null
     and not new.deleted then
    -- perangkat dengan data lama tidak boleh membuka kembali shift / hari usaha yang sudah ditutup
    return null;
  end if;
  return new;
end; $$;
create trigger guard_closed_records before update on public.store_data
for each row execute function public.guard_closed_records();