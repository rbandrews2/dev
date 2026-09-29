create or replace function public.apply_purchase_payment_event(p_event jsonb)
returns text language plpgsql security invoker set search_path = '' as $$
declare s jsonb := p_event->'data'->'object'; d public.purchase_deliveries%rowtype; next_status text;
begin
 if p_event->>'type' not in ('checkout.session.completed','checkout.session.async_payment_succeeded','checkout.session.async_payment_failed') then return 'ignored'; end if;
 if nullif(s->'metadata'->>'delivery_token_hash','') is null then return 'ignored'; end if;
 select * into d from public.purchase_deliveries where delivery_token_hash=s->'metadata'->>'delivery_token_hash' and checkout_session_id=s->>'id' for update;
 if not found then raise exception 'Purchase delivery mapping not found'; end if;
 if exists(select 1 from public.processed_stripe_events where event_id=p_event->>'id') then return 'duplicate'; end if;
 if s->>'payment_status'='paid' then next_status := 'ready';
 elsif p_event->>'type'='checkout.session.async_payment_failed' then next_status := 'failed';
 else next_status := 'pending'; end if;
 update public.purchase_deliveries set
 status=case when status='ready' then status when next_status='pending' and status='failed' then status else next_status end,
 customer_email=coalesce(nullif(s->'customer_details'->>'email',''),nullif(s->>'customer_email',''),customer_email),
 stripe_payment_intent_id=coalesce(nullif(s->>'payment_intent',''),stripe_payment_intent_id),
 stripe_customer_id=coalesce(nullif(s->>'customer',''),stripe_customer_id),
 fulfilled_at=case when next_status='ready' then coalesce(fulfilled_at,now()) else fulfilled_at end
 where id=d.id;
 insert into public.processed_stripe_events(event_id) values(p_event->>'id');
 return next_status;
end $$;
revoke all on function public.apply_purchase_payment_event(jsonb) from public,anon,authenticated;
grant execute on function public.apply_purchase_payment_event(jsonb) to service_role;
