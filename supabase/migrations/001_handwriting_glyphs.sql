-- El Yazım: kullanıcı başına harf glifi
-- Mevcut kurulumlara eklemek için SQL Editor'de çalıştırın.

create table if not exists public.handwriting_glyphs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  letter text not null check (char_length(letter) = 1),
  stroke_data jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, letter)
);

create index if not exists handwriting_glyphs_user_id_idx on public.handwriting_glyphs (user_id);

drop trigger if exists handwriting_glyphs_set_updated_at on public.handwriting_glyphs;
create trigger handwriting_glyphs_set_updated_at
  before update on public.handwriting_glyphs
  for each row
  execute function private.set_updated_at();

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

alter table public.handwriting_glyphs enable row level security;

revoke all on table public.handwriting_glyphs from public, anon, authenticated;

grant execute on function public.list_handwriting_glyphs(uuid) to anon, authenticated;
grant execute on function public.get_handwriting_glyph(uuid, text) to anon, authenticated;
grant execute on function public.upsert_handwriting_glyph(uuid, text, jsonb) to anon, authenticated;
grant execute on function public.delete_handwriting_glyph(uuid, text) to anon, authenticated;

notify pgrst, 'reload schema';
