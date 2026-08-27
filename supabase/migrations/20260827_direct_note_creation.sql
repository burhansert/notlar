-- Doğrudan not oluşturma: section_id ve notebook_id isteğe bağlı.
-- Supabase SQL Editor'da çalıştırın (schema.sql değil).

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
  from public.notebooks
  where user_id = found_user.id
  order by updated_at desc, created_at asc
  limit 1;

  if found_notebook.id is null then
    perform private.create_default_notebook(found_user.id);

    select *
      into found_notebook
    from public.notebooks
    where user_id = found_user.id
    order by created_at asc
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

drop function if exists public.create_note(uuid, uuid, text, text);

create or replace function public.create_note(
  p_token uuid,
  p_title text,
  p_content text,
  p_section_id uuid default null,
  p_notebook_id uuid default null
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
  found_section := private.resolve_section_for_note(p_token, p_notebook_id, p_section_id);

  insert into public.notes (user_id, section_id, title, content)
  values (found_user.id, found_section.id, coalesce(p_title, ''), coalesce(p_content, ''))
  returning * into new_note;

  update public.notebooks
  set updated_at = now()
  where id = found_section.notebook_id;

  return new_note;
end;
$$;

grant execute on function public.create_note(uuid, text, text, uuid, uuid) to anon, authenticated;

notify pgrst, 'reload schema';
