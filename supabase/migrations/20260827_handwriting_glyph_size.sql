-- El yazısı okuma sayfası font (glif) boyutu tercihi

alter table public.users
  add column if not exists handwriting_glyph_size integer not null default 40
  check (handwriting_glyph_size between 28 and 56);

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

grant execute on function public.get_handwriting_glyph_size(uuid) to anon, authenticated;
grant execute on function public.set_handwriting_glyph_size(uuid, integer) to anon, authenticated;

notify pgrst, 'reload schema';
