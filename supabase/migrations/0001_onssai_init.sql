-- OnSsAI temel sema. Yeni ve bos bir Supabase projesine uygulanir.
-- Her tabloda RLS acik; yardimci fonksiyonlar API'ye acik olmayan "private" semada.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

-- ============ TABLOLAR ============

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company_type text not null check (company_type in ('buyer', 'supplier')),
  country text not null default 'TR',
  approved boolean not null default false,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  full_name text not null default '',
  email text not null,
  role text not null default 'owner' check (role in ('owner', 'member')),
  is_platform_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  category text not null,
  description text,
  unit_price numeric(14,2) not null check (unit_price >= 0),
  currency text not null default 'USD',
  moq integer check (moq is null or moq > 0),
  lead_time_days integer check (lead_time_days is null or lead_time_days >= 0),
  created_at timestamptz not null default now()
);

create table public.rfqs (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  description text not null default '',
  category text not null,
  quantity integer not null check (quantity > 0),
  unit text not null default 'adet',
  deadline date not null,
  status text not null default 'open' check (status in ('open', 'awarded', 'closed')),
  created_at timestamptz not null default now()
);

create table public.quotations (
  id uuid primary key default gen_random_uuid(),
  rfq_id uuid not null references public.rfqs(id) on delete cascade,
  supplier_id uuid not null references public.companies(id) on delete cascade,
  unit_price numeric(14,2) not null check (unit_price >= 0),
  currency text not null default 'USD',
  delivery_time_days integer not null check (delivery_time_days >= 0),
  payment_terms text,
  validity_days integer,
  notes text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  unique (rfq_id, supplier_id)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  rfq_id uuid references public.rfqs(id) on delete set null,
  quotation_id uuid unique references public.quotations(id) on delete set null,
  buyer_id uuid not null references public.companies(id),
  supplier_id uuid not null references public.companies(id),
  quantity integer not null,
  unit_price numeric(14,2) not null,
  total_amount numeric(16,2) not null,
  currency text not null,
  status text not null default 'active' check (status in ('active', 'shipped', 'delivered', 'cancelled')),
  created_at timestamptz not null default now()
);

create table public.order_stages (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  stage_number integer not null,
  stage_name text not null,
  required_photos integer not null default 1 check (required_photos >= 1),
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'done')),
  created_at timestamptz not null default now(),
  unique (order_id, stage_number)
);

create table public.evidence (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  stage_id uuid not null references public.order_stages(id) on delete restrict,
  uploaded_by_user_id uuid not null references public.users(id),
  file_type text not null default 'photo',
  file_path text not null unique,
  file_size_bytes bigint,
  file_hash text not null,
  device_id text,
  taken_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  sender_id uuid not null references public.users(id),
  original_text text not null check (length(original_text) between 1 and 5000),
  created_at timestamptz not null default now()
);

create index on public.users (company_id);
create index on public.products (supplier_id);
create index on public.rfqs (buyer_id);
create index on public.rfqs (status);
create index on public.quotations (rfq_id);
create index on public.quotations (supplier_id);
create index on public.orders (buyer_id);
create index on public.orders (supplier_id);
create index on public.orders (rfq_id);
create index on public.order_stages (order_id);
create index on public.evidence (order_id);
create index on public.evidence (stage_id);
create index on public.evidence (uploaded_by_user_id);
create index on public.messages (order_id);
create index on public.messages (sender_id);

-- ============ YARDIMCI FONKSIYONLAR (private) ============

create or replace function private.current_company_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select company_id from public.users where id = (select auth.uid())
$$;

create or replace function private.current_company_type()
returns text language sql stable security definer set search_path = '' as $$
  select c.company_type from public.users u join public.companies c on c.id = u.company_id
  where u.id = (select auth.uid())
$$;

create or replace function private.company_approved()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select c.approved from public.users u join public.companies c on c.id = u.company_id
                   where u.id = (select auth.uid())), false)
$$;

create or replace function private.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select is_platform_admin from public.users where id = (select auth.uid())), false)
$$;

create or replace function private.is_order_party(p_order_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.orders o
    where o.id = p_order_id
      and private.current_company_id() in (o.buyer_id, o.supplier_id)
  )
$$;

create or replace function private.is_order_buyer(p_order_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.orders o
    where o.id = p_order_id and o.buyer_id = private.current_company_id()
  )
$$;

create or replace function private.is_rfq_buyer(p_rfq_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.rfqs r
    where r.id = p_rfq_id and r.buyer_id = private.current_company_id()
  )
$$;

create or replace function private.has_quoted_rfq(p_rfq_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.quotations q
    where q.rfq_id = p_rfq_id and q.supplier_id = private.current_company_id()
  )
$$;

-- Ayni siparisi paylasan sirketlerin kullanicilari birbirinin adini gorebilir
create or replace function private.shares_order_with(p_company_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.orders o
    where (o.buyer_id = private.current_company_id() and o.supplier_id = p_company_id)
       or (o.supplier_id = private.current_company_id() and o.buyer_id = p_company_id)
  )
$$;

revoke all on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;

-- ============ TRIGGERLAR ============

-- Kayitta sirket + profil olustur. Tip sadece buyer/supplier olabilir, admin asla buradan verilmez.
create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_company_id uuid;
  v_type text := coalesce(new.raw_user_meta_data->>'company_type', 'buyer');
begin
  if v_type not in ('buyer', 'supplier') then
    v_type := 'buyer';
  end if;

  insert into public.companies (name, company_type, country)
  values (
    coalesce(nullif(trim(new.raw_user_meta_data->>'company_name'), ''), split_part(new.email, '@', 1)),
    v_type,
    upper(left(coalesce(nullif(trim(new.raw_user_meta_data->>'country'), ''), 'TR'), 2))
  )
  returning id into v_company_id;

  insert into public.users (id, company_id, full_name, email, role)
  values (new.id, v_company_id, coalesce(new.raw_user_meta_data->>'full_name', ''), new.email, 'owner');

  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Alici teklifi sadece pending -> accepted/rejected yapabilir; baska alan degistiremez.
-- Kabulde siparis olusur, diger teklifler reddedilir, RFQ "awarded" olur.
create or replace function private.handle_quotation_status()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_rfq public.rfqs%rowtype;
begin
  if (new.rfq_id, new.supplier_id, new.unit_price, new.currency, new.delivery_time_days,
      new.payment_terms, new.validity_days, new.notes, new.created_at)
     is distinct from
     (old.rfq_id, old.supplier_id, old.unit_price, old.currency, old.delivery_time_days,
      old.payment_terms, old.validity_days, old.notes, old.created_at) then
    raise exception 'Teklifin sadece durumu degistirilebilir';
  end if;

  if new.status = old.status then
    return new;
  end if;
  if old.status <> 'pending' then
    raise exception 'Bu teklif zaten sonuclandi';
  end if;

  if new.status = 'accepted' then
    select * into v_rfq from public.rfqs where id = new.rfq_id for update;
    if v_rfq.status <> 'open' then
      raise exception 'RFQ artik acik degil';
    end if;

    insert into public.orders (rfq_id, quotation_id, buyer_id, supplier_id, quantity, unit_price, total_amount, currency)
    values (v_rfq.id, new.id, v_rfq.buyer_id, new.supplier_id, v_rfq.quantity, new.unit_price,
            v_rfq.quantity * new.unit_price, new.currency);

    update public.rfqs set status = 'awarded' where id = v_rfq.id;
    update public.quotations set status = 'rejected'
      where rfq_id = v_rfq.id and id <> new.id and status = 'pending';
  end if;

  return new;
end $$;

create trigger on_quotation_status
  before update on public.quotations
  for each row execute function private.handle_quotation_status();

-- Kanit: asama baglantisi 15 dk sonra kilitlenir, dosya/hash hic degismez
create or replace function private.check_evidence_change()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (new.order_id, new.uploaded_by_user_id, new.file_path, new.file_hash, new.taken_at, new.created_at)
     is distinct from
     (old.order_id, old.uploaded_by_user_id, old.file_path, old.file_hash, old.taken_at, old.created_at) then
    raise exception 'Kanit kaydi degistirilemez';
  end if;
  if new.stage_id is distinct from old.stage_id and old.created_at < now() - interval '15 minutes' then
    raise exception 'Asama 15 dakikadan sonra degistirilemez';
  end if;
  return new;
end $$;

create trigger on_evidence_update
  before update on public.evidence
  for each row execute function private.check_evidence_change();

-- Kanit 30 dk sonra silinemez
create or replace function private.check_evidence_delete()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.created_at < now() - interval '30 minutes' then
    raise exception 'Kanit 30 dakikadan sonra silinemez';
  end if;
  return old;
end $$;

create trigger on_evidence_delete
  before delete on public.evidence
  for each row execute function private.check_evidence_delete();

-- ============ RLS ============

alter table public.companies    enable row level security;
alter table public.users        enable row level security;
alter table public.products     enable row level security;
alter table public.rfqs         enable row level security;
alter table public.quotations   enable row level security;
alter table public.orders       enable row level security;
alter table public.order_stages enable row level security;
alter table public.evidence     enable row level security;
alter table public.messages     enable row level security;

-- Anonim kullanici hicbir tabloya erisemez
revoke all on all tables in schema public from anon;

-- companies: giris yapan herkes sirket listesini gorur (vitrin). Onay sadece admin.
create policy companies_select on public.companies for select to authenticated using (true);
create policy companies_admin_update on public.companies for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- users: kendisi, ayni sirket, ortak sipariste karsi taraf, admin
create policy users_select on public.users for select to authenticated using (
  id = (select auth.uid())
  or company_id = (select private.current_company_id())
  or private.shares_order_with(company_id)
  or (select private.is_admin())
);
create policy users_update_self on public.users for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
-- Kullanici sadece adini degistirebilir (admin/sirket/rol alanlari kilitli)
revoke update on public.users from authenticated;
grant update (full_name) on public.users to authenticated;

-- products: herkes gorur; onayli tedarikci kendi urununu yonetir
create policy products_select on public.products for select to authenticated using (true);
create policy products_insert on public.products for insert to authenticated with check (
  supplier_id = (select private.current_company_id())
  and (select private.current_company_type()) = 'supplier'
  and (select private.company_approved())
);
create policy products_update on public.products for update to authenticated
  using (supplier_id = (select private.current_company_id()))
  with check (supplier_id = (select private.current_company_id()));
create policy products_delete on public.products for delete to authenticated
  using (supplier_id = (select private.current_company_id()));

-- rfqs: alici kendininkini; onayli tedarikci acik olanlari ve teklif verdiklerini gorur
create policy rfqs_select on public.rfqs for select to authenticated using (
  buyer_id = (select private.current_company_id())
  or (status = 'open' and (select private.current_company_type()) = 'supplier' and (select private.company_approved()))
  or private.has_quoted_rfq(id)
  or (select private.is_admin())
);
create policy rfqs_insert on public.rfqs for insert to authenticated with check (
  buyer_id = (select private.current_company_id())
  and (select private.current_company_type()) = 'buyer'
  and (select private.company_approved())
  and status = 'open'
);
create policy rfqs_update on public.rfqs for update to authenticated
  using (buyer_id = (select private.current_company_id()))
  with check (buyer_id = (select private.current_company_id()));

-- quotations: tedarikci kendininkini, alici kendi RFQ'suna geleni gorur
create policy quotations_select on public.quotations for select to authenticated using (
  supplier_id = (select private.current_company_id())
  or private.is_rfq_buyer(rfq_id)
  or (select private.is_admin())
);
create policy quotations_insert on public.quotations for insert to authenticated with check (
  supplier_id = (select private.current_company_id())
  and (select private.current_company_type()) = 'supplier'
  and (select private.company_approved())
  and status = 'pending'
  and exists (select 1 from public.rfqs r where r.id = rfq_id and r.status = 'open')
);
-- Kabul/red: sadece RFQ sahibi alici (trigger sadece durum degisikligine izin verir)
create policy quotations_update_buyer on public.quotations for update to authenticated
  using (private.is_rfq_buyer(rfq_id)) with check (private.is_rfq_buyer(rfq_id));

-- orders: sadece taraflar ve admin gorur; olusturma sadece trigger ile
create policy orders_select on public.orders for select to authenticated using (
  buyer_id = (select private.current_company_id())
  or supplier_id = (select private.current_company_id())
  or (select private.is_admin())
);

-- order_stages: taraflar gorur; asamalari alici belirler
create policy stages_select on public.order_stages for select to authenticated using (
  private.is_order_party(order_id) or (select private.is_admin())
);
create policy stages_insert on public.order_stages for insert to authenticated
  with check (private.is_order_buyer(order_id));
create policy stages_update on public.order_stages for update to authenticated
  using (private.is_order_buyer(order_id)) with check (private.is_order_buyer(order_id));

-- evidence: taraflar gorur ve yukler; sadece yukleyen (30 dk icinde) silebilir
create policy evidence_select on public.evidence for select to authenticated using (
  private.is_order_party(order_id) or (select private.is_admin())
);
create policy evidence_insert on public.evidence for insert to authenticated with check (
  uploaded_by_user_id = (select auth.uid())
  and private.is_order_party(order_id)
  and exists (select 1 from public.order_stages s where s.id = stage_id and s.order_id = evidence.order_id)
  and file_path like order_id::text || '/%'
);
create policy evidence_update on public.evidence for update to authenticated
  using (uploaded_by_user_id = (select auth.uid()))
  with check (uploaded_by_user_id = (select auth.uid())
    and exists (select 1 from public.order_stages s where s.id = stage_id and s.order_id = evidence.order_id));
create policy evidence_delete on public.evidence for delete to authenticated
  using (uploaded_by_user_id = (select auth.uid()));

-- messages: taraflar okur ve yazar, kendi adina
create policy messages_select on public.messages for select to authenticated using (
  private.is_order_party(order_id) or (select private.is_admin())
);
create policy messages_insert on public.messages for insert to authenticated with check (
  sender_id = (select auth.uid()) and private.is_order_party(order_id)
);

-- ============ STORAGE: evidence (PRIVATE) ============
-- Dosya yolu: <order_id>/<dosya>. Erisim sadece siparis taraflarina, signed URL ile.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('evidence', 'evidence', false, 15728640, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do update set public = false;

create or replace function private.storage_order_id(p_name text)
returns uuid language plpgsql immutable set search_path = '' as $$
begin
  return (storage.foldername(p_name))[1]::uuid;
exception when others then
  return null;
end $$;
revoke all on function private.storage_order_id(text) from public, anon;
grant execute on function private.storage_order_id(text) to authenticated;

create policy evidence_objects_select on storage.objects for select to authenticated using (
  bucket_id = 'evidence' and private.is_order_party(private.storage_order_id(name))
);
create policy evidence_objects_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'evidence' and private.is_order_party(private.storage_order_id(name))
);
create policy evidence_objects_delete on storage.objects for delete to authenticated using (
  bucket_id = 'evidence' and owner_id = (select auth.uid())::text
);
