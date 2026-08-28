-- Not defteri şifresi ve 2 dakikalık oturum kilidi.
-- Mevcut veritabanına güvenle uygulanır (tablo silmez, veri silmez).

alter table public.notebooks
  add column if not exists password text;

create table if not exists private.notebook_unlocks (
  session_token uuid not null references public.sessions (token) on delete cascade,
  notebook_id uuid not null references public.notebooks (id) on delete cascade,
  last_seen_at timestamptz not null default now(),
  primary key (session_token, notebook_id)
);

create index if not exists notebook_unlocks_last_seen_idx
  on private.notebook_unlocks (last_seen_at);

create or replace function private.notebook_password_set(p_password text)
returns boolean
language sql
immutable
as $$
  select p_password is not null and char_length(p_password) > 0;
$$;

create or replace function private.notebook_is_unlocked(p_token uuid, p_notebook_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  found_password text;
  seen_at timestamptz;
begin
  select n.password
    into found_password
  from public.notebooks n
  where n.id = p_notebook_id;

  if found_password is null and not exists (select 1 from public.notebooks where id = p_notebook_id) then
    return false;
  end if;

  if not private.notebook_password_set(found_password) then
    return true;
  end if;

  select u.last_seen_at
    into seen_at
  from private.notebook_unlocks u
  where u.session_token = p_token
    and u.notebook_id = p_notebook_id;

  return seen_at is not null and seen_at > now() - interval '2 minutes';
end;
$$;

create or replace function private.assert_notebook_unlocked(p_token uuid, p_notebook_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not private.notebook_is_unlocked(p_token, p_notebook_id) then
    raise exception 'Not defteri kilitli. Şifreyi girin.';
  end if;
end;
$$;

create or replace function private.touch_notebook_unlock(p_token uuid, p_notebook_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into private.notebook_unlocks (session_token, notebook_id, last_seen_at)
  values (p_token, p_notebook_id, now())
  on conflict (session_token, notebook_id)
  do update set last_seen_at = now();
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

  perform private.assert_notebook_unlocked(p_token, found_section.notebook_id);

  return found_section;
end;
$$;

create or replace function private.resolve_section_for_note(
  p_token uuid,
  p_notebook_id uuid,
  p_section_id uuid
)
returns public.sections
language plpgsql
security definer
set search_path = public
as $$
declare
  found_user public.users;
  found_section public.sections;
  found_notebook public.notebooks;
begin
  found_user := private.user_from_token(p_token);

  if p_section_id is not null then
    return private.section_from_token(p_token, p_section_id);
  end if;

  if p_notebook_id is not null then
    found_notebook := private.notebook_from_token(p_token, p_notebook_id);
    perform private.assert_notebook_unlocked(p_token, found_notebook.id);

    select s.*
      into found_section
    from public.sections s
    where s.notebook_id = found_notebook.id
    order by s.sort_order asc, s.created_at asc
    limit 1;

    if found_section.id is null then
      insert into public.sections (notebook_id, title, sort_order)
      values (found_notebook.id, 'Genel', 0)
      returning * into found_section;
    end if;

    return found_section;
  end if;

  select *
    into found_notebook
  from public.notebooks n
  where n.user_id = found_user.id
    and private.notebook_is_unlocked(p_token, n.id)
  order by n.updated_at desc, n.created_at asc
  limit 1;

  if found_notebook.id is null then
    perform private.create_default_notebook(found_user.id);

    select *
      into found_notebook
    from public.notebooks
    where user_id = found_user.id
      and private.notebook_is_unlocked(p_token, id)
    order by created_at desc
    limit 1;
  end if;

  select s.*
    into found_section
  from public.sections s
  where s.notebook_id = found_notebook.id
  order by s.sort_order asc, s.created_at asc
  limit 1;

  if found_section.id is null then
    insert into public.sections (notebook_id, title, sort_order)
    values (found_notebook.id, 'Genel', 0)
    returning * into found_section;
  end if;

  return found_section;
end;
$$;

drop function if exists public.list_notebooks(uuid);

create or replace function public.list_notebooks(p_token uuid)
returns table (
  id uuid,
  user_id uuid,
  title text,
  created_at timestamptz,
  updated_at timestamptz,
  section_count bigint,
  note_count bigint,
  is_locked boolean
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
      ) as note_count,
      private.notebook_password_set(n.password) as is_locked
    from public.notebooks n
    where n.user_id = found_user.id
    order by n.updated_at desc;
end;
$$;

drop function if exists public.create_notebook(uuid, text);
drop function if exists public.create_notebook(uuid, text, text);

create or replace function public.create_notebook(p_token uuid, p_title text, p_password text default null)
returns public.notebooks
language plpgsql
security definer
set search_path = public
as $$
declare
  found_user public.users;
  new_notebook public.notebooks;
  normalized_password text;
begin
  found_user := private.user_from_token(p_token);
  normalized_password := nullif(trim(coalesce(p_password, '')), '');

  if normalized_password is not null and char_length(normalized_password) < 6 then
    raise exception 'Şifre en az 6 karakter olmalı.';
  end if;

  insert into public.notebooks (user_id, title, password)
  values (
    found_user.id,
    coalesce(nullif(trim(p_title), ''), 'Yeni not defteri'),
    normalized_password
  )
  returning * into new_notebook;

  if normalized_password is not null then
    perform private.touch_notebook_unlock(p_token, new_notebook.id);
  end if;

  new_notebook.password := null;
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

  updated_notebook.password := null;
  return updated_notebook;
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
  perform private.assert_notebook_unlocked(p_token, p_notebook_id);

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
  perform private.assert_notebook_unlocked(p_token, p_notebook_id);

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
    perform private.assert_notebook_unlocked(p_token, p_notebook_id);

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

drop function if exists public.get_note(uuid, uuid);

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
  found_notebook_id uuid;
begin
  found_user := private.user_from_token(p_token);

  select nb.id
    into found_notebook_id
  from public.notes n
  join public.sections s on s.id = n.section_id
  join public.notebooks nb on nb.id = s.notebook_id
  where n.id = p_id
    and (nb.user_id = found_user.id or found_user.role = 'admin');

  if found_notebook_id is null then
    raise exception 'Not bulunamadı.';
  end if;

  perform private.assert_notebook_unlocked(p_token, found_notebook_id);

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

  perform private.assert_notebook_unlocked(p_token, old_notebook_id);

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

  select nb.id
    into found_notebook_id
  from public.notes n
  join public.sections s on s.id = n.section_id
  join public.notebooks nb on nb.id = s.notebook_id
  where n.id = p_id
    and (nb.user_id = found_user.id or found_user.role = 'admin');

  if found_notebook_id is null then
    raise exception 'Not bulunamadı.';
  end if;

  perform private.assert_notebook_unlocked(p_token, found_notebook_id);

  delete from public.notes n
  where n.id = p_id
  returning n.id into deleted_id;

  if deleted_id is null then
    raise exception 'Not bulunamadı.';
  end if;

  update public.notebooks
  set updated_at = now()
  where id = found_notebook_id;
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
      case
        when private.notebook_password_set(nb.password) then ''
        else n.content
      end as content,
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

create or replace function public.unlock_notebook(p_token uuid, p_id uuid, p_password text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  found_notebook public.notebooks;
begin
  found_notebook := private.notebook_from_token(p_token, p_id);

  if not private.notebook_password_set(found_notebook.password) then
    return;
  end if;

  if found_notebook.password <> coalesce(p_password, '') then
    raise exception 'Şifre hatalı.';
  end if;

  perform private.touch_notebook_unlock(p_token, found_notebook.id);
end;
$$;

create or replace function public.lock_notebook(p_token uuid, p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform private.user_from_token(p_token);
  delete from private.notebook_unlocks
  where session_token = p_token
    and notebook_id = p_id;
end;
$$;

create or replace function public.touch_notebook(p_token uuid, p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform private.notebook_from_token(p_token, p_id);
  perform private.assert_notebook_unlocked(p_token, p_id);

  if exists (
    select 1
    from private.notebook_unlocks
    where session_token = p_token
      and notebook_id = p_id
  ) then
    update private.notebook_unlocks
    set last_seen_at = now()
    where session_token = p_token
      and notebook_id = p_id;
  end if;
end;
$$;

create or replace function public.set_notebook_password(
  p_token uuid,
  p_id uuid,
  p_new_password text,
  p_current_password text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  found_user public.users;
  found_notebook public.notebooks;
  normalized_new text;
begin
  found_user := private.user_from_token(p_token);
  found_notebook := private.notebook_from_token(p_token, p_id);

  if found_notebook.user_id <> found_user.id then
    raise exception 'Yalnızca not defteri sahibi şifre koyabilir.';
  end if;

  if private.notebook_password_set(found_notebook.password)
     and found_notebook.password <> coalesce(p_current_password, '') then
    raise exception 'Mevcut şifre hatalı.';
  end if;

  normalized_new := nullif(trim(coalesce(p_new_password, '')), '');

  if normalized_new is not null and char_length(normalized_new) < 6 then
    raise exception 'Şifre en az 6 karakter olmalı.';
  end if;

  update public.notebooks
  set password = normalized_new
  where id = p_id;

  delete from private.notebook_unlocks where notebook_id = p_id;

  if normalized_new is not null then
    perform private.touch_notebook_unlock(p_token, p_id);
  end if;
end;
$$;

grant execute on function public.list_notebooks(uuid) to anon, authenticated;
grant execute on function public.create_notebook(uuid, text, text) to anon, authenticated;
grant execute on function public.unlock_notebook(uuid, uuid, text) to anon, authenticated;
grant execute on function public.lock_notebook(uuid, uuid) to anon, authenticated;
grant execute on function public.touch_notebook(uuid, uuid) to anon, authenticated;
grant execute on function public.set_notebook_password(uuid, uuid, text, text) to anon, authenticated;

notify pgrst, 'reload schema';
