-- notes.notebook_id: doğrudan deftere bağlı notlar (section_id null).
-- Hiçbir deftere bağlı olmayan notlar: section_id ve notebook_id null.
-- list_context kaldırılır.

ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS notebook_id uuid REFERENCES public.notebooks (id) ON DELETE CASCADE;

UPDATE public.notes n
SET
  notebook_id = s.notebook_id,
  section_id = NULL
FROM public.sections s
WHERE n.section_id = s.id
  AND n.list_context = 'sections';

UPDATE public.notes
SET
  section_id = NULL,
  notebook_id = NULL
WHERE list_context = 'notebooks';

ALTER TABLE public.notes
  ALTER COLUMN section_id DROP NOT NULL;

ALTER TABLE public.notes
  DROP COLUMN IF EXISTS list_context;

ALTER TABLE public.notes
  DROP CONSTRAINT IF EXISTS notes_section_or_notebook_check;

ALTER TABLE public.notes
  ADD CONSTRAINT notes_section_or_notebook_check
  CHECK (NOT (section_id IS NOT NULL AND notebook_id IS NOT NULL));

CREATE INDEX IF NOT EXISTS notes_notebook_id_idx ON public.notes (notebook_id);

DROP FUNCTION IF EXISTS public.create_note(uuid, text, text, uuid, uuid, text);
DROP FUNCTION IF EXISTS public.create_note(uuid, text, text, uuid, uuid);

CREATE OR REPLACE FUNCTION public.create_note(
  p_token uuid,
  p_title text,
  p_content text,
  p_section_id uuid DEFAULT NULL,
  p_notebook_id uuid DEFAULT NULL
)
RETURNS public.notes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  found_user public.users;
  found_section public.sections;
  found_notebook public.notebooks;
  new_note public.notes;
BEGIN
  found_user := private.user_from_token(p_token);

  IF p_section_id IS NOT NULL AND p_notebook_id IS NOT NULL THEN
    RAISE EXCEPTION 'Not hem bölüme hem deftere doğrudan bağlanamaz.';
  END IF;

  IF p_section_id IS NOT NULL THEN
    found_section := private.section_from_token(p_token, p_section_id);

    INSERT INTO public.notes (user_id, section_id, notebook_id, title, content)
    VALUES (found_user.id, found_section.id, NULL, coalesce(p_title, ''), coalesce(p_content, ''))
    RETURNING * INTO new_note;

    UPDATE public.notebooks
    SET updated_at = now()
    WHERE id = found_section.notebook_id;
  ELSIF p_notebook_id IS NOT NULL THEN
    found_notebook := private.notebook_from_token(p_token, p_notebook_id);

    INSERT INTO public.notes (user_id, section_id, notebook_id, title, content)
    VALUES (found_user.id, NULL, found_notebook.id, coalesce(p_title, ''), coalesce(p_content, ''))
    RETURNING * INTO new_note;

    UPDATE public.notebooks
    SET updated_at = now()
    WHERE id = found_notebook.id;
  ELSE
    INSERT INTO public.notes (user_id, section_id, notebook_id, title, content)
    VALUES (found_user.id, NULL, NULL, coalesce(p_title, ''), coalesce(p_content, ''))
    RETURNING * INTO new_note;
  END IF;

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
      NULL::uuid AS notebook_id,
      NULL::text AS notebook_title,
      NULL::text AS section_title
    FROM public.notes n
    WHERE n.user_id = found_user.id
      AND n.section_id IS NULL
      AND n.notebook_id IS NULL
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
  found_user := private.user_from_token(p_token);
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
      NULL::text AS section_title
    FROM public.notes n
    JOIN public.notebooks nb ON nb.id = n.notebook_id
    WHERE n.section_id IS NULL
      AND n.notebook_id = p_notebook_id
      AND (nb.user_id = found_user.id OR found_user.role = 'admin')
    ORDER BY n.updated_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION private.note_notebook_id(p_note public.notes)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_note.section_id IS NOT NULL THEN (
      SELECT s.notebook_id
      FROM public.sections s
      WHERE s.id = p_note.section_id
    )
    ELSE p_note.notebook_id
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
  found_note public.notes;
  found_notebook_id uuid;
BEGIN
  found_user := private.user_from_token(p_token);

  SELECT *
    INTO found_note
  FROM public.notes n
  WHERE n.id = p_id
    AND (n.user_id = found_user.id OR found_user.role = 'admin');

  IF found_note.id IS NULL THEN
    RAISE EXCEPTION 'Not bulunamadı.';
  END IF;

  IF found_note.section_id IS NOT NULL THEN
    SELECT nb.id
      INTO found_notebook_id
    FROM public.sections s
    JOIN public.notebooks nb ON nb.id = s.notebook_id
    WHERE s.id = found_note.section_id
      AND (nb.user_id = found_user.id OR found_user.role = 'admin');

    IF found_notebook_id IS NULL THEN
      RAISE EXCEPTION 'Not bulunamadı.';
    END IF;

    PERFORM private.assert_notebook_unlocked(p_token, found_notebook_id);

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
    RETURN;
  END IF;

  IF found_note.notebook_id IS NOT NULL THEN
    PERFORM private.assert_notebook_unlocked(p_token, found_note.notebook_id);

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
        NULL::text AS section_title
      FROM public.notes n
      JOIN public.notebooks nb ON nb.id = n.notebook_id
      WHERE n.id = p_id
        AND (nb.user_id = found_user.id OR found_user.role = 'admin');
    RETURN;
  END IF;

  RETURN QUERY
    SELECT
      n.id,
      n.user_id,
      n.section_id,
      n.title,
      n.content,
      n.created_at,
      n.updated_at,
      NULL::uuid AS notebook_id,
      NULL::text AS notebook_title,
      NULL::text AS section_title
    FROM public.notes n
    WHERE n.id = p_id
      AND n.user_id = found_user.id;
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
  existing_note public.notes;
  updated_note public.notes;
  old_notebook_id uuid;
  new_notebook_id uuid;
  target_section public.sections;
BEGIN
  found_user := private.user_from_token(p_token);

  SELECT *
    INTO existing_note
  FROM public.notes n
  WHERE n.id = p_id
    AND (n.user_id = found_user.id OR found_user.role = 'admin');

  IF existing_note.id IS NULL THEN
    RAISE EXCEPTION 'Not bulunamadı.';
  END IF;

  old_notebook_id := private.note_notebook_id(existing_note);

  IF old_notebook_id IS NOT NULL THEN
    PERFORM private.assert_notebook_unlocked(p_token, old_notebook_id);
  END IF;

  IF p_section_id IS NOT NULL THEN
    target_section := private.section_from_token(p_token, p_section_id);

    UPDATE public.notes n
    SET title = coalesce(p_title, ''),
        content = coalesce(p_content, ''),
        section_id = target_section.id,
        notebook_id = NULL
    WHERE n.id = p_id
      AND (n.user_id = found_user.id OR found_user.role = 'admin')
    RETURNING n.* INTO updated_note;

    new_notebook_id := target_section.notebook_id;
  ELSE
    UPDATE public.notes n
    SET title = coalesce(p_title, ''),
        content = coalesce(p_content, '')
    WHERE n.id = p_id
      AND (n.user_id = found_user.id OR found_user.role = 'admin')
    RETURNING n.* INTO updated_note;

    new_notebook_id := private.note_notebook_id(updated_note);
  END IF;

  IF updated_note.id IS NULL THEN
    RAISE EXCEPTION 'Not bulunamadı.';
  END IF;

  IF old_notebook_id IS NOT NULL THEN
    UPDATE public.notebooks
    SET updated_at = now()
    WHERE id = old_notebook_id;
  END IF;

  IF new_notebook_id IS NOT NULL AND new_notebook_id IS DISTINCT FROM old_notebook_id THEN
    UPDATE public.notebooks
    SET updated_at = now()
    WHERE id = new_notebook_id;
  END IF;

  RETURN updated_note;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_note(p_token uuid, p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  found_user public.users;
  existing_note public.notes;
  found_notebook_id uuid;
BEGIN
  found_user := private.user_from_token(p_token);

  SELECT *
    INTO existing_note
  FROM public.notes n
  WHERE n.id = p_id
    AND (n.user_id = found_user.id OR found_user.role = 'admin');

  IF existing_note.id IS NULL THEN
    RAISE EXCEPTION 'Not bulunamadı.';
  END IF;

  found_notebook_id := private.note_notebook_id(existing_note);

  IF found_notebook_id IS NOT NULL THEN
    PERFORM private.assert_notebook_unlocked(p_token, found_notebook_id);
  END IF;

  DELETE FROM public.notes
  WHERE id = p_id;

  IF found_notebook_id IS NOT NULL THEN
    UPDATE public.notebooks
    SET updated_at = now()
    WHERE id = found_notebook_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_notebooks(p_token uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  title text,
  created_at timestamptz,
  updated_at timestamptz,
  section_count bigint,
  note_count bigint,
  is_locked boolean
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
      n.title,
      n.created_at,
      n.updated_at,
      (SELECT count(*) FROM public.sections s WHERE s.notebook_id = n.id) AS section_count,
      (
        SELECT count(*)
        FROM public.notes nt
        LEFT JOIN public.sections s ON s.id = nt.section_id
        WHERE s.notebook_id = n.id
           OR nt.notebook_id = n.id
      ) AS note_count,
      private.notebook_password_set(n.password) AS is_locked
    FROM public.notebooks n
    WHERE n.user_id = found_user.id
    ORDER BY n.updated_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_notes(p_token uuid)
RETURNS TABLE (
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
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  found_user public.users;
BEGIN
  found_user := private.user_from_token(p_token);
  IF found_user.role <> 'admin' THEN
    RAISE EXCEPTION 'Bu işlem için yönetici yetkisi gerekir.';
  END IF;

  RETURN QUERY
    SELECT
      n.id,
      n.user_id,
      n.section_id,
      n.title,
      n.content,
      n.created_at,
      n.updated_at,
      u.email AS author_email,
      coalesce(nb_direct.title, nb_section.title) AS notebook_title,
      s.title AS section_title
    FROM public.notes n
    JOIN public.users u ON u.id = n.user_id
    LEFT JOIN public.sections s ON s.id = n.section_id
    LEFT JOIN public.notebooks nb_section ON nb_section.id = s.notebook_id
    LEFT JOIN public.notebooks nb_direct ON nb_direct.id = n.notebook_id
    ORDER BY n.updated_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_note(uuid, text, text, uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_notebook_page_notes(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_sections_page_notes(uuid, uuid) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
