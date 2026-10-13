create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  phone text not null unique,
  name text,
  pickup_point text check (pickup_point in ('T22', 'T34')),
  identity_number text,
  is_manager boolean not null default false,
  onboarding_complete boolean not null default false,
  subscription_status text default 'expired' check (subscription_status in ('expired', 'pending', 'active')),
  subscription_end_date timestamptz,
  last_transaction_ref text,
  payment_rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.menu (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  meal_type text not null check (meal_type in ('Breakfast', 'Lunch', 'Dinner')),
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  menu_id uuid not null references public.menu (id) on delete restrict,
  meal_type text not null check (meal_type in ('Breakfast', 'Lunch', 'Dinner')),
  order_date date not null,
  status text not null default 'Pending' check (status in ('Pending', 'Packed', 'Arrived', 'Delivered')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_one_per_user_per_meal_per_day unique (user_id, meal_type, order_date)
);

create index if not exists idx_menu_meal_type on public.menu (meal_type);
create index if not exists idx_orders_user_id on public.orders (user_id);
create index if not exists idx_orders_meal_type_order_date on public.orders (meal_type, order_date);
create index if not exists idx_users_is_manager on public.users (is_manager);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
before update on public.users
for each row
execute function public.set_updated_at();

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
before update on public.orders
for each row
execute function public.set_updated_at();

create or replace function public.is_manager(check_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users
    where id = check_user_id
      and is_manager = true
  );
$$;

create or replace function public.can_submit_order(
  check_user_id uuid,
  requested_menu_id uuid,
  requested_meal_type text,
  requested_order_date date
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with server_clock as (
    select timezone('Africa/Addis_Ababa', now()) as addis_now
  ),
  active_window as (
    select
      case
        when ((extract(hour from addis_now)::int * 60) + extract(minute from addis_now)::int) >= 7 * 60
          and ((extract(hour from addis_now)::int * 60) + extract(minute from addis_now)::int) < 8 * 60
          then 'Breakfast'
        when ((extract(hour from addis_now)::int * 60) + extract(minute from addis_now)::int) >= 11 * 60
          and ((extract(hour from addis_now)::int * 60) + extract(minute from addis_now)::int) < 13 * 60
          then 'Lunch'
        when ((extract(hour from addis_now)::int * 60) + extract(minute from addis_now)::int) >= 17 * 60
          and ((extract(hour from addis_now)::int * 60) + extract(minute from addis_now)::int) < 19 * 60
          then 'Dinner'
        else null
      end as active_meal_type,
      addis_now::date as service_date
    from server_clock
  )
  select exists (
    select 1
    from public.users u
    join public.menu m
      on m.id = requested_menu_id
    cross join active_window aw
    where u.id = check_user_id
      and u.subscription_status = 'active'
      and u.subscription_end_date is not null
      and u.subscription_end_date > now()
      and m.meal_type = requested_meal_type
      and aw.active_meal_type = requested_meal_type
      and requested_order_date = aw.service_date
  );
$$;

alter table public.users enable row level security;
alter table public.menu enable row level security;
alter table public.orders enable row level security;

drop policy if exists "Users can read own profile" on public.users;
create policy "Users can read own profile"
on public.users
for select
to authenticated
using (auth.uid() = id or public.is_manager(auth.uid()));

drop policy if exists "Users can insert own profile" on public.users;
create policy "Users can insert own profile"
on public.users
for insert
to authenticated
with check (auth.uid() = id or public.is_manager(auth.uid()));

drop policy if exists "Users can update own profile" on public.users;
create policy "Users can update own profile"
on public.users
for update
to authenticated
using (auth.uid() = id or public.is_manager(auth.uid()))
with check (auth.uid() = id or public.is_manager(auth.uid()));

drop policy if exists "Students and managers can read menu" on public.menu;
create policy "Students and managers can read menu"
on public.menu
for select
to authenticated
using (true);

drop policy if exists "Managers can insert menu" on public.menu;
create policy "Managers can insert menu"
on public.menu
for insert
to authenticated
with check (public.is_manager(auth.uid()));

drop policy if exists "Managers can update menu" on public.menu;
create policy "Managers can update menu"
on public.menu
for update
to authenticated
using (public.is_manager(auth.uid()))
with check (public.is_manager(auth.uid()));

drop policy if exists "Managers can delete menu" on public.menu;
create policy "Managers can delete menu"
on public.menu
for delete
to authenticated
using (public.is_manager(auth.uid()));

drop policy if exists "Users can read own orders" on public.orders;
create policy "Users can read own orders"
on public.orders
for select
to authenticated
using (auth.uid() = user_id or public.is_manager(auth.uid()));

drop policy if exists "Users can insert own orders" on public.orders;
create policy "Users can insert own orders"
on public.orders
for insert
to authenticated
with check (
  (auth.uid() = user_id and public.can_submit_order(user_id, menu_id, meal_type, order_date))
  or public.is_manager(auth.uid())
);

drop policy if exists "Managers can update orders" on public.orders;
create policy "Managers can update orders"
on public.orders
for update
to authenticated
using (public.is_manager(auth.uid()))
with check (public.is_manager(auth.uid()));

drop policy if exists "Managers can delete orders" on public.orders;
create policy "Managers can delete orders"
on public.orders
for delete
to authenticated
using (public.is_manager(auth.uid()));
