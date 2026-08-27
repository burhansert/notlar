-- Notlar: Supabase Auth KULLANILMAZ.
-- E-posta ve şifre public.users tablosuna yazılır (şifre bcrypt ile hash'lenir).
-- Supabase SQL Editor'de tek seferde çalıştırın.

create extension if not exists pgcrypto;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

drop table if exists public.notes cascade;
drop table if exists public.sessions cascade;
drop table if exists public.users cascade;
drop table if exists public.profiles cascade;
drop table if exists public.app_users cascade;

create table public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint email_format check (email ~* '^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$')
);

create table public.sessions (
  token uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days')
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  title text not null default '',
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index notes_user_id_idx on public.notes (user_id);
create index notes_updated_at_idx on public.notes (updated_at desc);
create index sessions_user_id_idx on public.sessions (user_id);

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

create or replace function private.user_from_token(p_token uuid)
returns public.users
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  current_user_row public.users;
begin
  select u.*
    into current_user_row
  from public.sessions s
  join public.users u on u.id = s.user_id
  where s.token = p_token
    and s.expires_at > now();

  if current_user_row.id is null then
    raise exception 'Oturum geçersiz veya süresi dolmuş. Tekrar giriş yapın.';
  end if;

  if not current_user_row.is_active then
    raise exception 'Hesabınız yönetici tarafından durduruldu.';
  end if;

  return current_user_row;
end;
$$;

create or replace function private.user_json(u public.users)
returns json
language sql
immutable
as $$
  select json_build_object(
    'id', u.id,
    'email', u.email,
    'role', u.role,
    'is_active', u.is_active,
    'created_at', u.created_at
  );
$$;

create or replace function private.session_json(p_token uuid, u public.users)
returns json
language sql
immutable
as $$
  select json_build_object(
    'token', p_token,
    'user', private.user_json(u)
  );
$$;

create or replace function public.register_user(p_email text, p_password text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  new_user public.users;
  new_token uuid;
  next_role text;
  normalized text;
begin
  normalized := lower(trim(p_email));

  if normalized is null or normalized !~* '^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$' then
    raise exception 'Geçerli bir e-posta girin.';
  end if;
  if p_password is null or char_length(p_password) < 6 then
    raise exception 'Şifre en az 6 karakter olmalı.';
  end if;
  if exists (select 1 from public.users where email = normalized) then
    raise exception 'Bu e-posta zaten kayıtlı.';
  end if;

  if exists (select 1 from public.users where role = 'admin') then
    next_role := 'user';
  else
    next_role := 'admin';
  end if;

  insert into public.users (email, password_hash, role)
  values (normalized, crypt(p_password, gen_salt('bf')), next_role)
  returning * into new_user;

  insert into public.sessions (user_id)
  values (new_user.id)
  returning token into new_token;

  return private.session_json(new_token, new_user);
end;
$$;

create or replace function public.login_user(p_email text, p_password text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  found_user public.users;
  new_token uuid;
begin
  select *
    into found_user
  from public.users
  where email = lower(trim(p_email));

  if found_user.id is null or found_user.password_hash <> crypt(p_password, found_user.password_hash) then
    raise exception 'E-posta veya şifre hatalı.';
  end if;

  if not found_user.is_active then
    raise exception 'Hesabınız yönetici tarafından durduruldu.';
  end if;

  insert into public.sessions (user_id)
  values (found_user.id)
  returning token into new_token;

  return private.session_json(new_token, found_user);
end;
$$;

create or replace function public.restore_session(p_token uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  found_user public.users;
begin
  found_user := private.user_from_token(p_token);
  return private.session_json(p_token, found_user);
end;
$$;

create or replace function public.logout_user(p_token uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.sessions where token = p_token;
end;
$$;

create or replace function public.list_notes(p_token uuid)
returns setof public.notes
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  found_user public.users;
begin
  found_user := private.user_from_token(p_token);
  return query
    select *
    from public.notes
    where user_id = found_user.id
    order by updated_at desc;
end;
$$;

create or replace function public.get_note(p_token uuid, p_id uuid)
returns public.notes
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  found_user public.users;
  found_note public.notes;
begin
  found_user := private.user_from_token(p_token);

  select *
    into found_note
  from public.notes
  where id = p_id
    and (user_id = found_user.id or found_user.role = 'admin');

  if found_note.id is null then
    raise exception 'Not bulunamadı.';
  end if;

  return found_note;
end;
$$;

create or replace function public.create_note(p_token uuid, p_title text, p_content text)
returns public.notes
language plpgsql
security definer
set search_path = public
as $$
declare
  found_user public.users;
  new_note public.notes;
begin
  found_user := private.user_from_token(p_token);

  insert into public.notes (user_id, title, content)
  values (found_user.id, coalesce(p_title, ''), coalesce(p_content, ''))
  returning * into new_note;

  return new_note;
end;
$$;

create or replace function public.update_note(p_token uuid, p_id uuid, p_title text, p_content text)
returns public.notes
language plpgsql
security definer
set search_path = public
as $$
declare
  found_user public.users;
  updated_note public.notes;
begin
  found_user := private.user_from_token(p_token);

  update public.notes
  set title = coalesce(p_title, ''),
      content = coalesce(p_content, '')
  where id = p_id
    and (user_id = found_user.id or found_user.role = 'admin')
  returning * into updated_note;

  if updated_note.id is null then
    raise exception 'Not bulunamadı.';
  end if;

  return updated_note;
end;
$$;

create or replace function public.delete_note(p_token uuid, p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  found_user public.users;
  deleted_id uuid;
begin
  found_user := private.user_from_token(p_token);

  delete from public.notes
  where id = p_id
    and (user_id = found_user.id or found_user.role = 'admin')
  returning id into deleted_id;

  if deleted_id is null then
    raise exception 'Not bulunamadı.';
  end if;
end;
$$;

create or replace function public.admin_list_users(p_token uuid)
returns table (
  id uuid,
  email text,
  role text,
  is_active boolean,
  created_at timestamptz,
  note_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  found_user public.users;
begin
  found_user := private.user_from_token(p_token);
  if found_user.role <> 'admin' then
    raise exception 'Bu işlem için yönetici yetkisi gerekir.';
  end if;

  return query
    select
      u.id,
      u.email,
      u.role,
      u.is_active,
      u.created_at,
      (select count(*) from public.notes n where n.user_id = u.id) as note_count
    from public.users u
    order by u.created_at desc;
end;
$$;

create or replace function public.admin_list_notes(p_token uuid)
returns table (
  id uuid,
  user_id uuid,
  title text,
  content text,
  created_at timestamptz,
  updated_at timestamptz,
  author_email text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  found_user public.users;
begin
  found_user := private.user_from_token(p_token);
  if found_user.role <> 'admin' then
    raise exception 'Bu işlem için yönetici yetkisi gerekir.';
  end if;

  return query
    select
      n.id,
      n.user_id,
      n.title,
      n.content,
      n.created_at,
      n.updated_at,
      u.email as author_email
    from public.notes n
    join public.users u on u.id = n.user_id
    order by n.updated_at desc;
end;
$$;

create or replace function public.admin_set_user(
  p_token uuid,
  p_user_id uuid,
  p_role text,
  p_is_active boolean
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  found_user public.users;
  updated_user public.users;
begin
  found_user := private.user_from_token(p_token);
  if found_user.role <> 'admin' then
    raise exception 'Bu işlem için yönetici yetkisi gerekir.';
  end if;
  if p_role not in ('user', 'admin') then
    raise exception 'Geçersiz rol.';
  end if;
  if p_user_id = found_user.id and p_role <> 'admin' then
    raise exception 'Kendi yönetici yetkinizi kaldıramazsınız.';
  end if;
  if p_user_id = found_user.id and p_is_active = false then
    raise exception 'Kendi hesabınızı durduramazsınız.';
  end if;

  update public.users
  set role = p_role,
      is_active = p_is_active
  where id = p_user_id
  returning * into updated_user;

  if updated_user.id is null then
    raise exception 'Kullanıcı bulunamadı.';
  end if;

  if updated_user.is_active = false then
    delete from public.sessions where user_id = updated_user.id;
  end if;

  return private.user_json(updated_user);
end;
$$;

create or replace function public.admin_delete_note(p_token uuid, p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  found_user public.users;
begin
  found_user := private.user_from_token(p_token);
  if found_user.role <> 'admin' then
    raise exception 'Bu işlem için yönetici yetkisi gerekir.';
  end if;
  perform public.delete_note(p_token, p_id);
end;
$$;

alter table public.users enable row level security;
alter table public.sessions enable row level security;
alter table public.notes enable row level security;

revoke all on table public.users from public, anon, authenticated;
revoke all on table public.sessions from public, anon, authenticated;
revoke all on table public.notes from public, anon, authenticated;

grant execute on function public.register_user(text, text) to anon, authenticated;
grant execute on function public.login_user(text, text) to anon, authenticated;
grant execute on function public.restore_session(uuid) to anon, authenticated;
grant execute on function public.logout_user(uuid) to anon, authenticated;
grant execute on function public.list_notes(uuid) to anon, authenticated;
grant execute on function public.get_note(uuid, uuid) to anon, authenticated;
grant execute on function public.create_note(uuid, text, text) to anon, authenticated;
grant execute on function public.update_note(uuid, uuid, text, text) to anon, authenticated;
grant execute on function public.delete_note(uuid, uuid) to anon, authenticated;
grant execute on function public.admin_list_users(uuid) to anon, authenticated;
grant execute on function public.admin_list_notes(uuid) to anon, authenticated;
grant execute on function public.admin_set_user(uuid, uuid, text, boolean) to anon, authenticated;
grant execute on function public.admin_delete_note(uuid, uuid) to anon, authenticated;

notify pgrst, 'reload schema';
