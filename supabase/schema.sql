-- Notlar: Supabase Auth KULLANILMAZ.
-- E-posta ve şifre public.users tablosuna düz metin olarak yazılır.
--
-- UYARI: Bu dosya sıfırdan kurulum içindir (DROP TABLE ile tüm veriyi siler).
-- Verisi olan bir Supabase projesinde ÇALIŞTIRMAYIN.
-- Mevcut DB güncellemeleri için supabase/migrations/ altındaki dosyaları kullanın.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

drop table if exists public.handwriting_glyphs cascade;
drop table if exists public.notes cascade;
drop table if exists public.sections cascade;
drop table if exists public.notebooks cascade;
drop table if exists public.sessions cascade;
drop table if exists public.users cascade;
drop table if exists public.profiles cascade;
drop table if exists public.app_users cascade;

create table public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password text not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  is_active boolean not null default true,
  handwriting_glyph_size integer not null default 40 check (handwriting_glyph_size between 28 and 56),
  created_at timestamptz not null default now(),
  constraint email_format check (email ~* '^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$')
);

create table public.sessions (
  token uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days')
);

create table public.notebooks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  title text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sections (
  id uuid primary key default gen_random_uuid(),
  notebook_id uuid not null references public.notebooks (id) on delete cascade,
  title text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  section_id uuid not null references public.sections (id) on delete cascade,
  title text not null default '',
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.handwriting_glyphs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  letter text not null check (char_length(letter) = 1),
  stroke_data jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, letter)
);

create index notebooks_user_id_idx on public.notebooks (user_id);
create index notebooks_updated_at_idx on public.notebooks (updated_at desc);
create index sections_notebook_id_idx on public.sections (notebook_id);
create index sections_sort_order_idx on public.sections (notebook_id, sort_order);
create index notes_user_id_idx on public.notes (user_id);
create index notes_section_id_idx on public.notes (section_id);
create index notes_updated_at_idx on public.notes (updated_at desc);
create index handwriting_glyphs_user_id_idx on public.handwriting_glyphs (user_id);
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

drop trigger if exists notebooks_set_updated_at on public.notebooks;
create trigger notebooks_set_updated_at
  before update on public.notebooks
  for each row
  execute function private.set_updated_at();

drop trigger if exists sections_set_updated_at on public.sections;
create trigger sections_set_updated_at
  before update on public.sections
  for each row
  execute function private.set_updated_at();

drop trigger if exists notes_set_updated_at on public.notes;
create trigger notes_set_updated_at
  before update on public.notes
  for each row
  execute function private.set_updated_at();

drop trigger if exists handwriting_glyphs_set_updated_at on public.handwriting_glyphs;
create trigger handwriting_glyphs_set_updated_at
  before update on public.handwriting_glyphs
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

create or replace function private.notebook_from_token(p_token uuid, p_notebook_id uuid)
returns public.notebooks
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  found_user public.users;
  found_notebook public.notebooks;
begin
  found_user := private.user_from_token(p_token);

  select *
    into found_notebook
  from public.notebooks
  where id = p_notebook_id
    and (user_id = found_user.id or found_user.role = 'admin');

  if found_notebook.id is null then
    raise exception 'Not defteri bulunamadı.';
  end if;

  return found_notebook;
end;
$$;

create or replace function private.section_from_token(p_token uuid, p_section_id uuid)
returns public.sections
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  found_user public.users;
  found_section public.sections;
begin
  found_user := private.user_from_token(p_token);

  select s.*
    into found_section
  from public.sections s
  join public.notebooks n on n.id = s.notebook_id
  where s.id = p_section_id
    and (n.user_id = found_user.id or found_user.role = 'admin');

  if found_section.id is null then
    raise exception 'Bölüm bulunamadı.';
  end if;

  return found_section;
end;
$$;

create or replace function private.create_default_notebook(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  new_notebook_id uuid;
begin
  insert into public.notebooks (user_id, title)
  values (p_user_id, 'Notlarım')
  returning id into new_notebook_id;

  insert into public.sections (notebook_id, title, sort_order)
  values (new_notebook_id, 'Genel', 0);
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

-- Dönüş tipi veya imza değişen fonksiyonlar için önce kaldır
drop function if exists public.admin_delete_note(uuid);
drop function if exists public.admin_set_user(uuid, uuid, text, boolean);
drop function if exists public.admin_list_notes(uuid);
drop function if exists public.admin_list_users(uuid);
drop function if exists public.delete_note(uuid, uuid);
drop function if exists public.update_note(uuid, uuid, text, text);
drop function if exists public.create_note(uuid, uuid, text, text);
drop function if exists public.create_note(uuid, text, text);
drop function if exists public.get_note(uuid, uuid);
drop function if exists public.list_notes(uuid, uuid);
drop function if exists public.list_notes(uuid);
drop function if exists public.delete_section(uuid, uuid);
drop function if exists public.update_section(uuid, uuid, text, int);
drop function if exists public.create_section(uuid, uuid, text);
drop function if exists public.list_sections(uuid, uuid);
drop function if exists public.delete_notebook(uuid, uuid);
drop function if exists public.update_notebook(uuid, uuid, text);
drop function if exists public.create_notebook(uuid, text);
drop function if exists public.list_notebooks(uuid);
drop function if exists public.logout_user(uuid);
drop function if exists public.restore_session(uuid);
drop function if exists public.login_user(text, text);
drop function if exists public.register_user(text, text);

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

  insert into public.users (email, password, role)
  values (normalized, p_password, next_role)
  returning * into new_user;

  perform private.create_default_notebook(new_user.id);

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

  if found_user.id is null or found_user.password <> p_password then
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

create or replace function public.list_notebooks(p_token uuid)
returns table (
  id uuid,
  user_id uuid,
  title text,
  created_at timestamptz,
  updated_at timestamptz,
  section_count bigint,
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

  return query
    select
      n.id,
      n.user_id,
      n.title,
      n.created_at,
      n.updated_at,
      (select count(*) from public.sections s where s.notebook_id = n.id) as section_count,
      (
        select count(*)
        from public.notes nt
        join public.sections s on s.id = nt.section_id
        where s.notebook_id = n.id
      ) as note_count
    from public.notebooks n
    where n.user_id = found_user.id
    order by n.updated_at desc;
end;
$$;

create or replace function public.create_notebook(p_token uuid, p_title text)
returns public.notebooks
language plpgsql
security definer
set search_path = public
as $$
declare
  found_user public.users;
  new_notebook public.notebooks;
begin
  found_user := private.user_from_token(p_token);

  insert into public.notebooks (user_id, title)
  values (found_user.id, coalesce(nullif(trim(p_title), ''), 'Yeni not defteri'))
  returning * into new_notebook;

  return new_notebook;
end;
$$;

create or replace function public.update_notebook(p_token uuid, p_id uuid, p_title text)
returns public.notebooks
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_notebook public.notebooks;
begin
  perform private.notebook_from_token(p_token, p_id);

  update public.notebooks
  set title = coalesce(nullif(trim(p_title), ''), 'Yeni not defteri')
  where id = p_id
  returning * into updated_notebook;

  return updated_notebook;
end;
$$;

create or replace function public.delete_notebook(p_token uuid, p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_id uuid;
begin
  perform private.notebook_from_token(p_token, p_id);

  delete from public.notebooks
  where id = p_id
  returning id into deleted_id;

  if deleted_id is null then
    raise exception 'Not defteri bulunamadı.';
  end if;
end;
$$;

create or replace function public.list_sections(p_token uuid, p_notebook_id uuid)
returns table (
  id uuid,
  notebook_id uuid,
  title text,
  sort_order int,
  created_at timestamptz,
  updated_at timestamptz,
  note_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform private.notebook_from_token(p_token, p_notebook_id);

  return query
    select
      s.id,
      s.notebook_id,
      s.title,
      s.sort_order,
      s.created_at,
      s.updated_at,
      (select count(*) from public.notes n where n.section_id = s.id) as note_count
    from public.sections s
    where s.notebook_id = p_notebook_id
    order by s.sort_order asc, s.created_at asc;
end;
$$;

create or replace function public.create_section(p_token uuid, p_notebook_id uuid, p_title text)
returns public.sections
language plpgsql
security definer
set search_path = public
as $$
declare
  next_order int;
  new_section public.sections;
begin
  perform private.notebook_from_token(p_token, p_notebook_id);

  select coalesce(max(sort_order), -1) + 1
    into next_order
  from public.sections
  where notebook_id = p_notebook_id;

  insert into public.sections (notebook_id, title, sort_order)
  values (p_notebook_id, coalesce(nullif(trim(p_title), ''), 'Yeni bölüm'), next_order)
  returning * into new_section;

  update public.notebooks
  set updated_at = now()
  where id = p_notebook_id;

  return new_section;
end;
$$;

create or replace function public.update_section(
  p_token uuid,
  p_id uuid,
  p_title text,
  p_sort_order int default null,
  p_notebook_id uuid default null
)
returns public.sections
language plpgsql
security definer
set search_path = public
as $$
declare
  found_section public.sections;
  updated_section public.sections;
  target_notebook_id uuid;
  next_order int;
begin
  found_section := private.section_from_token(p_token, p_id);
  target_notebook_id := coalesce(p_notebook_id, found_section.notebook_id);

  if p_notebook_id is not null and p_notebook_id <> found_section.notebook_id then
    perform private.notebook_from_token(p_token, p_notebook_id);

    select coalesce(max(sort_order), -1) + 1
      into next_order
    from public.sections
    where notebook_id = p_notebook_id;
  else
    next_order := coalesce(p_sort_order, found_section.sort_order);
  end if;

  update public.sections
  set title = coalesce(nullif(trim(p_title), ''), title),
      sort_order = case
        when p_notebook_id is not null and p_notebook_id <> found_section.notebook_id then next_order
        else coalesce(p_sort_order, sort_order)
      end,
      notebook_id = target_notebook_id
  where id = p_id
  returning * into updated_section;

  update public.notebooks
  set updated_at = now()
  where id = found_section.notebook_id;

  if target_notebook_id <> found_section.notebook_id then
    update public.notebooks
    set updated_at = now()
    where id = target_notebook_id;
  end if;

  return updated_section;
end;
$$;

create or replace function public.delete_section(p_token uuid, p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  found_section public.sections;
  deleted_id uuid;
begin
  found_section := private.section_from_token(p_token, p_id);

  delete from public.sections
  where id = p_id
  returning id into deleted_id;

  if deleted_id is null then
    raise exception 'Bölüm bulunamadı.';
  end if;

  update public.notebooks
  set updated_at = now()
  where id = found_section.notebook_id;
end;
$$;

create or replace function public.list_notes(p_token uuid, p_section_id uuid)
returns setof public.notes
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform private.section_from_token(p_token, p_section_id);

  return query
    select *
    from public.notes
    where section_id = p_section_id
    order by updated_at desc;
end;
$$;

create or replace function public.get_note(p_token uuid, p_id uuid)
returns table (
  id uuid,
  user_id uuid,
  section_id uuid,
  title text,
  content text,
  created_at timestamptz,
  updated_at timestamptz,
  notebook_id uuid,
  notebook_title text,
  section_title text
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

  return query
    select
      n.id,
      n.user_id,
      n.section_id,
      n.title,
      n.content,
      n.created_at,
      n.updated_at,
      nb.id as notebook_id,
      nb.title as notebook_title,
      s.title as section_title
    from public.notes n
    join public.sections s on s.id = n.section_id
    join public.notebooks nb on nb.id = s.notebook_id
    where n.id = p_id
      and (nb.user_id = found_user.id or found_user.role = 'admin');
end;
$$;

create or replace function public.create_note(
  p_token uuid,
  p_section_id uuid,
  p_title text,
  p_content text
)
returns public.notes
language plpgsql
security definer
set search_path = public
as $$
declare
  found_user public.users;
  found_section public.sections;
  new_note public.notes;
begin
  found_user := private.user_from_token(p_token);
  found_section := private.section_from_token(p_token, p_section_id);

  insert into public.notes (user_id, section_id, title, content)
  values (found_user.id, found_section.id, coalesce(p_title, ''), coalesce(p_content, ''))
  returning * into new_note;

  update public.notebooks
  set updated_at = now()
  where id = found_section.notebook_id;

  return new_note;
end;
$$;

create or replace function public.update_note(
  p_token uuid,
  p_id uuid,
  p_title text,
  p_content text,
  p_section_id uuid default null
)
returns public.notes
language plpgsql
security definer
set search_path = public
as $$
declare
  found_user public.users;
  updated_note public.notes;
  old_notebook_id uuid;
  new_notebook_id uuid;
  target_section public.sections;
begin
  found_user := private.user_from_token(p_token);

  if p_section_id is not null then
    target_section := private.section_from_token(p_token, p_section_id);
  end if;

  select nb.id
    into old_notebook_id
  from public.notes n
  join public.sections s on s.id = n.section_id
  join public.notebooks nb on nb.id = s.notebook_id
  where n.id = p_id
    and (nb.user_id = found_user.id or found_user.role = 'admin');

  if old_notebook_id is null then
    raise exception 'Not bulunamadı.';
  end if;

  update public.notes n
  set title = coalesce(p_title, ''),
      content = coalesce(p_content, ''),
      section_id = coalesce(p_section_id, n.section_id)
  from public.sections s
  join public.notebooks nb on nb.id = s.notebook_id
  where n.id = p_id
    and n.section_id = s.id
    and (nb.user_id = found_user.id or found_user.role = 'admin')
  returning n.* into updated_note;

  if updated_note.id is null then
    raise exception 'Not bulunamadı.';
  end if;

  select s.notebook_id
    into new_notebook_id
  from public.sections s
  where s.id = updated_note.section_id;

  update public.notebooks
  set updated_at = now()
  where id = old_notebook_id;

  if new_notebook_id <> old_notebook_id then
    update public.notebooks
    set updated_at = now()
    where id = new_notebook_id;
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
  found_notebook_id uuid;
begin
  found_user := private.user_from_token(p_token);

  delete from public.notes n
  using public.sections s, public.notebooks nb
  where n.id = p_id
    and n.section_id = s.id
    and s.notebook_id = nb.id
    and (nb.user_id = found_user.id or found_user.role = 'admin')
  returning n.id, nb.id into deleted_id, found_notebook_id;

  if deleted_id is null then
    raise exception 'Not bulunamadı.';
  end if;

  update public.notebooks
  set updated_at = now()
  where id = found_notebook_id;
end;
$$;

create or replace function public.admin_list_users(p_token uuid)
returns table (
  id uuid,
  email text,
  role text,
  is_active boolean,
  created_at timestamptz,
  note_count bigint,
  notebook_count bigint
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
      (select count(*) from public.notes n where n.user_id = u.id) as note_count,
      (select count(*) from public.notebooks nb where nb.user_id = u.id) as notebook_count
    from public.users u
    order by u.created_at desc;
end;
$$;

create or replace function public.admin_list_notes(p_token uuid)
returns table (
  id uuid,
  user_id uuid,
  section_id uuid,
  title text,
  content text,
  created_at timestamptz,
  updated_at timestamptz,
  author_email text,
  notebook_title text,
  section_title text
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
      n.section_id,
      n.title,
      n.content,
      n.created_at,
      n.updated_at,
      u.email as author_email,
      nb.title as notebook_title,
      s.title as section_title
    from public.notes n
    join public.users u on u.id = n.user_id
    join public.sections s on s.id = n.section_id
    join public.notebooks nb on nb.id = s.notebook_id
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

create or replace function public.list_handwriting_glyphs(p_token uuid)
returns setof public.handwriting_glyphs
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
    from public.handwriting_glyphs
    where user_id = found_user.id
    order by letter asc;
end;
$$;

create or replace function public.get_handwriting_glyph(p_token uuid, p_letter text)
returns public.handwriting_glyphs
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  found_user public.users;
  found_glyph public.handwriting_glyphs;
begin
  found_user := private.user_from_token(p_token);

  select *
    into found_glyph
  from public.handwriting_glyphs
  where user_id = found_user.id
    and letter = p_letter;

  return found_glyph;
end;
$$;

create or replace function public.upsert_handwriting_glyph(
  p_token uuid,
  p_letter text,
  p_stroke_data jsonb
)
returns public.handwriting_glyphs
language plpgsql
security definer
set search_path = public
as $$
declare
  found_user public.users;
  saved_glyph public.handwriting_glyphs;
begin
  found_user := private.user_from_token(p_token);

  if p_letter is null or char_length(p_letter) <> 1 then
    raise exception 'Geçerli bir harf seçin.';
  end if;

  insert into public.handwriting_glyphs (user_id, letter, stroke_data)
  values (found_user.id, p_letter, coalesce(p_stroke_data, '[]'::jsonb))
  on conflict (user_id, letter)
  do update set stroke_data = excluded.stroke_data
  returning * into saved_glyph;

  return saved_glyph;
end;
$$;

create or replace function public.delete_handwriting_glyph(p_token uuid, p_letter text)
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

  delete from public.handwriting_glyphs
  where user_id = found_user.id
    and letter = p_letter
  returning id into deleted_id;

  if deleted_id is null then
    raise exception 'Glif bulunamadı.';
  end if;
end;
$$;

create or replace function public.get_handwriting_glyph_size(p_token uuid)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  found_user public.users;
begin
  found_user := private.user_from_token(p_token);
  return found_user.handwriting_glyph_size;
end;
$$;

create or replace function public.set_handwriting_glyph_size(p_token uuid, p_glyph_size integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  found_user public.users;
  saved_size integer;
begin
  found_user := private.user_from_token(p_token);

  if p_glyph_size is null or p_glyph_size < 28 or p_glyph_size > 56 then
    raise exception 'Geçerli bir yazı boyutu seçin.';
  end if;

  update public.users
  set handwriting_glyph_size = p_glyph_size
  where id = found_user.id
  returning handwriting_glyph_size into saved_size;

  return saved_size;
end;
$$;

alter table public.users enable row level security;
alter table public.sessions enable row level security;
alter table public.notebooks enable row level security;
alter table public.sections enable row level security;
alter table public.notes enable row level security;
alter table public.handwriting_glyphs enable row level security;

revoke all on table public.users from public, anon, authenticated;
revoke all on table public.sessions from public, anon, authenticated;
revoke all on table public.notebooks from public, anon, authenticated;
revoke all on table public.sections from public, anon, authenticated;
revoke all on table public.notes from public, anon, authenticated;
revoke all on table public.handwriting_glyphs from public, anon, authenticated;

grant execute on function public.register_user(text, text) to anon, authenticated;
grant execute on function public.login_user(text, text) to anon, authenticated;
grant execute on function public.restore_session(uuid) to anon, authenticated;
grant execute on function public.logout_user(uuid) to anon, authenticated;
grant execute on function public.list_notebooks(uuid) to anon, authenticated;
grant execute on function public.create_notebook(uuid, text) to anon, authenticated;
grant execute on function public.update_notebook(uuid, uuid, text) to anon, authenticated;
grant execute on function public.delete_notebook(uuid, uuid) to anon, authenticated;
grant execute on function public.list_sections(uuid, uuid) to anon, authenticated;
grant execute on function public.create_section(uuid, uuid, text) to anon, authenticated;
grant execute on function public.update_section(uuid, uuid, text, int, uuid) to anon, authenticated;
grant execute on function public.delete_section(uuid, uuid) to anon, authenticated;
grant execute on function public.list_notes(uuid, uuid) to anon, authenticated;
grant execute on function public.get_note(uuid, uuid) to anon, authenticated;
grant execute on function public.create_note(uuid, uuid, text, text) to anon, authenticated;
grant execute on function public.update_note(uuid, uuid, text, text, uuid) to anon, authenticated;
grant execute on function public.delete_note(uuid, uuid) to anon, authenticated;
grant execute on function public.admin_list_users(uuid) to anon, authenticated;
grant execute on function public.admin_list_notes(uuid) to anon, authenticated;
grant execute on function public.admin_set_user(uuid, uuid, text, boolean) to anon, authenticated;
grant execute on function public.admin_delete_note(uuid, uuid) to anon, authenticated;
grant execute on function public.list_handwriting_glyphs(uuid) to anon, authenticated;
grant execute on function public.get_handwriting_glyph(uuid, text) to anon, authenticated;
grant execute on function public.upsert_handwriting_glyph(uuid, text, jsonb) to anon, authenticated;
grant execute on function public.delete_handwriting_glyph(uuid, text) to anon, authenticated;
grant execute on function public.get_handwriting_glyph_size(uuid) to anon, authenticated;
grant execute on function public.set_handwriting_glyph_size(uuid, integer) to anon, authenticated;

notify pgrst, 'reload schema';
