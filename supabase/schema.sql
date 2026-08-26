-- Notlar uygulaması şeması
-- Supabase SQL Editor'de tek seferde çalıştırın.

create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to postgres, authenticated;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  role text not null default 'user' check (role in ('user', 'admin')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint username_format check (username ~ '^[a-z0-9_]{3,20}$')
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null default '',
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notes_user_id_idx on public.notes (user_id);
create index if not exists notes_updated_at_idx on public.notes (updated_at desc);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists notes_set_updated_at on public.notes;
create trigger notes_set_updated_at
  before update on public.notes
  for each row
  execute function private.set_updated_at();

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and is_active = true
  );
$$;

create or replace function private.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and is_active = true
  );
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  next_role text;
begin
  if exists (select 1 from public.profiles where role = 'admin') then
    next_role := 'user';
  else
    next_role := 'admin';
  end if;

  insert into public.profiles (id, username, role)
  values (
    new.id,
    lower(coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))),
    next_role
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function private.handle_new_user();

alter table public.profiles enable row level security;
alter table public.notes enable row level security;

drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id or private.is_admin());

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin"
  on public.profiles
  for update
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

drop policy if exists "notes_select" on public.notes;
create policy "notes_select"
  on public.notes
  for select
  to authenticated
  using ((auth.uid() = user_id and private.is_active_user()) or private.is_admin());

drop policy if exists "notes_insert" on public.notes;
create policy "notes_insert"
  on public.notes
  for insert
  to authenticated
  with check (auth.uid() = user_id and private.is_active_user());

drop policy if exists "notes_update" on public.notes;
create policy "notes_update"
  on public.notes
  for update
  to authenticated
  using ((auth.uid() = user_id and private.is_active_user()) or private.is_admin())
  with check ((auth.uid() = user_id and private.is_active_user()) or private.is_admin());

drop policy if exists "notes_delete" on public.notes;
create policy "notes_delete"
  on public.notes
  for delete
  to authenticated
  using ((auth.uid() = user_id and private.is_active_user()) or private.is_admin());

grant select, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.notes to authenticated;
grant execute on function private.is_admin() to authenticated;
grant execute on function private.is_active_user() to authenticated;

revoke all on function private.handle_new_user() from public, anon, authenticated;
revoke all on function private.set_updated_at() from public, anon, authenticated;
revoke all on function private.is_admin() from public, anon;
revoke all on function private.is_active_user() from public, anon;
