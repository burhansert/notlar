-- Taşıma özelliği: bölümü başka not defterine, notu başka bölüme taşıma
-- Mevcut veritabanına güvenle uygulanır (tablo silmez, veri silmez).
-- Supabase SQL Editor'de yalnızca bu dosyayı çalıştırın.
-- UYARI: schema.sql'i çalıştırmayın — o dosya DROP TABLE içerir ve tüm veriyi siler.

DROP FUNCTION IF EXISTS public.get_note(uuid, uuid);
DROP FUNCTION IF EXISTS public.update_section(uuid, uuid, text, int);
DROP FUNCTION IF EXISTS public.update_note(uuid, uuid, text, text);

CREATE OR REPLACE FUNCTION public.update_section(
  p_token uuid,
  p_id uuid,
  p_title text,
  p_sort_order int DEFAULT NULL,
  p_notebook_id uuid DEFAULT NULL
)
RETURNS public.sections
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  found_section public.sections;
  updated_section public.sections;
  target_notebook_id uuid;
  next_order int;
BEGIN
  found_section := private.section_from_token(p_token, p_id);
  target_notebook_id := coalesce(p_notebook_id, found_section.notebook_id);

  IF p_notebook_id IS NOT NULL AND p_notebook_id <> found_section.notebook_id THEN
    PERFORM private.notebook_from_token(p_token, p_notebook_id);

    SELECT coalesce(max(sort_order), -1) + 1
      INTO next_order
    FROM public.sections
    WHERE notebook_id = p_notebook_id;
  ELSE
    next_order := coalesce(p_sort_order, found_section.sort_order);
  END IF;

  UPDATE public.sections
  SET title = coalesce(nullif(trim(p_title), ''), title),
      sort_order = CASE
        WHEN p_notebook_id IS NOT NULL AND p_notebook_id <> found_section.notebook_id THEN next_order
        ELSE coalesce(p_sort_order, sort_order)
      END,
      notebook_id = target_notebook_id
  WHERE id = p_id
  RETURNING * INTO updated_section;

  UPDATE public.notebooks SET updated_at = now() WHERE id = found_section.notebook_id;

  IF target_notebook_id <> found_section.notebook_id THEN
    UPDATE public.notebooks SET updated_at = now() WHERE id = target_notebook_id;
  END IF;

  RETURN updated_section;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_note(p_token uuid, p_id uuid)
RETURNS TABLE (
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
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  found_user public.users;
BEGIN
  found_user := private.user_from_token(p_token);

  RETURN QUERY
    SELECT
      n.id,
      n.user_id,
      n.section_id,
      n.title,
      n.content,
      n.created_at,
      n.updated_at,
      nb.id AS notebook_id,
      nb.title AS notebook_title,
      s.title AS section_title
    FROM public.notes n
    JOIN public.sections s ON s.id = n.section_id
    JOIN public.notebooks nb ON nb.id = s.notebook_id
    WHERE n.id = p_id
      AND (nb.user_id = found_user.id OR found_user.role = 'admin');
END;
$$;

CREATE OR REPLACE FUNCTION public.update_note(
  p_token uuid,
  p_id uuid,
  p_title text,
  p_content text,
  p_section_id uuid DEFAULT NULL
)
RETURNS public.notes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  found_user public.users;
  updated_note public.notes;
  old_notebook_id uuid;
  new_notebook_id uuid;
  target_section public.sections;
BEGIN
  found_user := private.user_from_token(p_token);

  IF p_section_id IS NOT NULL THEN
    target_section := private.section_from_token(p_token, p_section_id);
  END IF;

  SELECT nb.id
    INTO old_notebook_id
  FROM public.notes n
  JOIN public.sections s ON s.id = n.section_id
  JOIN public.notebooks nb ON nb.id = s.notebook_id
  WHERE n.id = p_id
    AND (nb.user_id = found_user.id OR found_user.role = 'admin');

  IF old_notebook_id IS NULL THEN
    RAISE EXCEPTION 'Not bulunamadı.';
  END IF;

  UPDATE public.notes n
  SET title = coalesce(p_title, ''),
      content = coalesce(p_content, ''),
      section_id = coalesce(p_section_id, n.section_id)
  FROM public.sections s
  JOIN public.notebooks nb ON nb.id = s.notebook_id
  WHERE n.id = p_id
    AND n.section_id = s.id
    AND (nb.user_id = found_user.id OR found_user.role = 'admin')
  RETURNING n.* INTO updated_note;

  IF updated_note.id IS NULL THEN
    RAISE EXCEPTION 'Not bulunamadı.';
  END IF;

  SELECT s.notebook_id
    INTO new_notebook_id
  FROM public.sections s
  WHERE s.id = updated_note.section_id;

  UPDATE public.notebooks SET updated_at = now() WHERE id = old_notebook_id;

  IF new_notebook_id <> old_notebook_id THEN
    UPDATE public.notebooks SET updated_at = now() WHERE id = new_notebook_id;
  END IF;

  RETURN updated_note;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_section(uuid, uuid, text, int, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_note(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_note(uuid, uuid, text, text, uuid) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
