-- Notların hangi üst sayfada listeleneceğini işaretler.
-- Supabase SQL Editor'da yalnızca bu dosyayı çalıştırın (schema.sql değil).

ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS list_context text
  CHECK (list_context IS NULL OR list_context IN ('notebooks', 'sections'));

DROP FUNCTION IF EXISTS public.create_note(uuid, text, text, uuid, uuid);
DROP FUNCTION IF EXISTS public.create_note(uuid, uuid, text, text);

CREATE OR REPLACE FUNCTION public.create_note(
  p_token uuid,
  p_title text,
  p_content text,
  p_section_id uuid DEFAULT NULL,
  p_notebook_id uuid DEFAULT NULL,
  p_list_context text DEFAULT NULL
)
RETURNS public.notes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  found_user public.users;
  found_section public.sections;
  new_note public.notes;
BEGIN
  found_user := private.user_from_token(p_token);
  found_section := private.resolve_section_for_note(p_token, p_notebook_id, p_section_id);

  IF p_list_context IS NOT NULL AND p_list_context NOT IN ('notebooks', 'sections') THEN
    RAISE EXCEPTION 'Geçersiz liste bağlamı.';
  END IF;

  INSERT INTO public.notes (user_id, section_id, title, content, list_context)
  VALUES (
    found_user.id,
    found_section.id,
    coalesce(p_title, ''),
    coalesce(p_content, ''),
    p_list_context
  )
  RETURNING * INTO new_note;

  UPDATE public.notebooks
  SET updated_at = now()
  WHERE id = found_section.notebook_id;

  RETURN new_note;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_notes(p_token uuid, p_section_id uuid)
RETURNS SETOF public.notes
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM private.section_from_token(p_token, p_section_id);

  RETURN QUERY
    SELECT *
    FROM public.notes
    WHERE section_id = p_section_id
      AND list_context IS NULL
    ORDER BY updated_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_notebook_page_notes(p_token uuid)
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
    WHERE n.list_context = 'notebooks'
      AND (nb.user_id = found_user.id OR found_user.role = 'admin')
      AND private.notebook_is_unlocked(p_token, nb.id)
    ORDER BY n.updated_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_sections_page_notes(p_token uuid, p_notebook_id uuid)
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
  PERFORM private.notebook_from_token(p_token, p_notebook_id);
  PERFORM private.assert_notebook_unlocked(p_token, p_notebook_id);

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
    WHERE n.list_context = 'sections'
      AND nb.id = p_notebook_id
    ORDER BY n.updated_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_note(uuid, text, text, uuid, uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_notebook_page_notes(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_sections_page_notes(uuid, uuid) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
