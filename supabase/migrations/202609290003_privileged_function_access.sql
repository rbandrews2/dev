create or replace function public.admin_timesheet_view(from_date date,to_date date)
returns table(id uuid,user_name text,clock_in timestamptz,clock_out timestamptz,total_hours numeric)
language sql security definer set search_path = '' as $$
select te.id,coalesce(p.name,u.full_name),te.clock_in,te.clock_out,extract(epoch from(te.clock_out-te.clock_in))/3600
from public.time_entries te
left join public.profiles p on p.user_id=te.user_id
left join public.users u on u.id=te.user_id
where te.clock_in::date between from_date and to_date
and exists(select 1 from public.profiles actor where actor.user_id=auth.uid()
 and actor.role in ('owner','admin') and actor.organization_id=p.organization_id
 and actor.organization_id is not null);
$$;
revoke all on function public.admin_timesheet_view(date,date) from public,anon;
grant execute on function public.admin_timesheet_view(date,date) to authenticated,service_role;
create or replace function public.create_org_and_profile(org_name text,user_id uuid,user_name text,user_email text)
returns void language plpgsql security definer set search_path = '' as $$
declare new_org_id uuid; verified_email text;
begin
 if auth.uid() is null or auth.uid() <> user_id then raise exception 'Caller identity does not match user' using errcode='42501'; end if;
 if exists(select 1 from public.profiles p where p.user_id=create_org_and_profile.user_id) then raise exception 'User already has a profile' using errcode='23505'; end if;
 select email into verified_email from auth.users where id=auth.uid();
 insert into public.organizations(name) values(org_name) returning id into new_org_id;
 insert into public.profiles(user_id,organization_id,name,email,role) values(user_id,new_org_id,user_name,verified_email,'owner');
end $$;
revoke all on function public.create_org_and_profile(text,uuid,text,text) from public,anon;
grant execute on function public.create_org_and_profile(text,uuid,text,text) to authenticated;
revoke all on function public.seed_default_work_types(uuid) from public,anon,authenticated;
grant execute on function public.seed_default_work_types(uuid) to service_role;
