-- Yeni Supabase projeleri tablolara varsayilan Data API izni vermiyor.
-- Her tabloya sadece gereken izni ver (en az yetki); satir erisimini RLS belirler.

revoke all on all tables in schema public from anon, authenticated;
grant all on all tables in schema public to service_role;

grant select on public.companies to authenticated;
grant update (approved, approved_at) on public.companies to authenticated;  -- RLS: sadece admin

grant select on public.users to authenticated;
grant update (full_name) on public.users to authenticated;

grant select, insert, update, delete on public.products to authenticated;
grant select, insert, update on public.rfqs to authenticated;

grant select, insert on public.quotations to authenticated;
grant update (status) on public.quotations to authenticated;  -- kabul/red

grant select on public.orders to authenticated;  -- olusturma sadece trigger ile

grant select, insert, update on public.order_stages to authenticated;

grant select, insert, delete on public.evidence to authenticated;
grant update (stage_id) on public.evidence to authenticated;  -- 15 dk icinde asama duzeltme

grant select, insert on public.messages to authenticated;
