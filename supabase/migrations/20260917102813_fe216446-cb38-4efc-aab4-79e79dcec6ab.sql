revoke all on function public.store_set_device_access(text, text[], jsonb) from public;
revoke all on function public.store_set_device_access(text, text[], jsonb) from anon;
grant execute on function public.store_set_device_access(text, text[], jsonb) to authenticated, service_role;