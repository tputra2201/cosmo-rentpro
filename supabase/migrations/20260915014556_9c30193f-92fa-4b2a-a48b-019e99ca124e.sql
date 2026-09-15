
revoke all on function public.developer_is_developer() from public;
revoke all on function public.developer_list_stores() from public;
revoke all on function public.developer_switch_store(uuid) from public;
grant execute on function public.developer_is_developer() to authenticated;
grant execute on function public.developer_list_stores() to authenticated;
grant execute on function public.developer_switch_store(uuid) to authenticated;
