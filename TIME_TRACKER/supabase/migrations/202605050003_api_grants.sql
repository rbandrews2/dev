-- Expose the isolated `_2` tables and helper functions to Supabase Auth/API roles.
-- RLS policies still control which rows each user can read or write.

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on table public.profiles_2 to authenticated;
grant select, insert, update, delete on table public.companies_2 to authenticated;
grant select, insert, update, delete on table public.memberships_2 to authenticated;
grant select, insert, update, delete on table public.job_sites_2 to authenticated;
grant select, insert, update, delete on table public.work_types_2 to authenticated;
grant select, insert, update, delete on table public.time_entries_2 to authenticated;
grant select, insert, update, delete on table public.gps_markers_2 to authenticated;

grant execute on function public.company_role(uuid) to authenticated;
grant execute on function public.is_company_member(uuid) to authenticated;
grant execute on function public.is_company_admin(uuid) to authenticated;
grant execute on function public.seed_default_work_types(uuid) to authenticated;

notify pgrst, 'reload schema';
