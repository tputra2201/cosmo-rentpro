create or replace function public.guard_default_console_settings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  def jsonb;
begin
  if new.kind <> 'settings' then
    return new;
  end if;

  def := case new.entity_id
    when 'rates' then '{"rates":{"PS3":5000,"PS4":8000,"PS5":12000}}'::jsonb
    when 'consoleTypes' then '{"consoleTypes":["PS3","PS4","PS5"]}'::jsonb
    else null
  end;

  if def is null then
    return new;
  end if;

  -- Nilai bawaan aplikasi tidak boleh menimpa daftar konsol / tarif store
  -- yang sudah diisi. Perangkat yang datanya tergerus akan mengambil ulang
  -- data dari pusat, bukan menimpanya.
  if new.payload = def and old.payload is distinct from def then
    return null;
  end if;

  return new;
end;
$$;

drop trigger if exists guard_default_console_settings on public.store_data;

create trigger guard_default_console_settings
before update on public.store_data
for each row
execute function public.guard_default_console_settings();