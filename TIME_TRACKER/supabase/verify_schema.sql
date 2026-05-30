-- Run this in the Supabase SQL editor after applying the migrations.
-- It should return one row for each required `_2` table.

select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'profiles_2',
    'company_billing_2',
    'companies_2',
    'memberships_2',
    'job_sites_2',
    'work_types_2',
    'time_entries_2',
    'time_entry_segments_2',
    'gps_markers_2'
  )
order by table_name;

notify pgrst, 'reload schema';

select
  has_table_privilege('authenticated', 'public.companies_2', 'INSERT') as authenticated_can_insert_companies_2,
  has_table_privilege('authenticated', 'public.company_billing_2', 'SELECT') as authenticated_can_select_company_billing_2,
  has_table_privilege('authenticated', 'public.memberships_2', 'SELECT') as authenticated_can_select_memberships_2,
  has_table_privilege('authenticated', 'public.time_entry_segments_2', 'INSERT') as authenticated_can_insert_time_entry_segments_2,
  has_function_privilege('authenticated', 'public.is_company_member(uuid)', 'EXECUTE') as authenticated_can_execute_membership_check;
