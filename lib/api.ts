import { supabase } from '@/lib/supabase';
import { translateError } from '@/lib/credentials';
import { resolveTurkishLetter } from '@/constants/turkish-alphabet';
import type {
  AppSession,
  HandwritingGlyph,
  Note,
  Notebook,
  ProfileWithNotes,
  Section,
  Stroke,
} from '@/lib/types';

async function rpc<T>(fn: string, args: Record<string, unknown>) {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(translateError(error.message));
  return data as T;
}

export function registerUser(email: string, password: string) {
  return rpc<AppSession>('register_user', { p_email: email, p_password: password });
}

export function loginUser(email: string, password: string) {
  return rpc<AppSession>('login_user', { p_email: email, p_password: password });
}

export function restoreSession(token: string) {
  return rpc<AppSession>('restore_session', { p_token: token });
}

export function logoutUser(token: string) {
  return rpc<null>('logout_user', { p_token: token });
}

export function listNotebooks(token: string) {
  return rpc<Notebook[] | null>('list_notebooks', { p_token: token }).then((rows) => rows ?? []);
}

export function createNotebook(token: string, title: string) {
  return rpc<Notebook>('create_notebook', { p_token: token, p_title: title });
}

export function updateNotebook(token: string, id: string, title: string) {
  return rpc<Notebook>('update_notebook', { p_token: token, p_id: id, p_title: title });
}

export function deleteNotebook(token: string, id: string) {
  return rpc<null>('delete_notebook', { p_token: token, p_id: id });
}

export function listSections(token: string, notebookId: string) {
  return rpc<Section[] | null>('list_sections', {
    p_token: token,
    p_notebook_id: notebookId,
  }).then((rows) => rows ?? []);
}

export function createSection(token: string, notebookId: string, title: string) {
  return rpc<Section>('create_section', {
    p_token: token,
    p_notebook_id: notebookId,
    p_title: title,
  });
}

export function updateSection(
  token: string,
  id: string,
  title: string,
  sortOrder?: number,
  notebookId?: string
) {
  return rpc<Section>('update_section', {
    p_token: token,
    p_id: id,
    p_title: title,
    p_sort_order: sortOrder ?? null,
    p_notebook_id: notebookId ?? null,
  });
}

export function deleteSection(token: string, id: string) {
  return rpc<null>('delete_section', { p_token: token, p_id: id });
}

export function listNotes(token: string, sectionId: string) {
  return rpc<Note[] | null>('list_notes', {
    p_token: token,
    p_section_id: sectionId,
  }).then((rows) => rows ?? []);
}

export async function getNote(token: string, id: string) {
  const data = await rpc<Note | Note[] | null>('get_note', { p_token: token, p_id: id });
  const note = Array.isArray(data) ? data[0] : data;
  if (!note) throw new Error('Not bulunamadı.');
  return note;
}

export function createNote(
  token: string,
  title: string,
  content: string,
  options?: { sectionId?: string; notebookId?: string }
) {
  return rpc<Note>('create_note', {
    p_token: token,
    p_title: title,
    p_content: content,
    p_section_id: options?.sectionId ?? null,
    p_notebook_id: options?.notebookId ?? null,
  });
}

export function updateNote(
  token: string,
  id: string,
  title: string,
  content: string,
  sectionId?: string
) {
  return rpc<Note>('update_note', {
    p_token: token,
    p_id: id,
    p_title: title,
    p_content: content,
    p_section_id: sectionId ?? null,
  });
}

export function deleteNote(token: string, id: string) {
  return rpc<null>('delete_note', { p_token: token, p_id: id });
}

export function adminListUsers(token: string) {
  return rpc<ProfileWithNotes[]>('admin_list_users', { p_token: token });
}

export function adminListNotes(token: string) {
  return rpc<Note[]>('admin_list_notes', { p_token: token });
}

export function adminSetUser(
  token: string,
  userId: string,
  role: 'user' | 'admin',
  isActive: boolean
) {
  return rpc<null>('admin_set_user', {
    p_token: token,
    p_user_id: userId,
    p_role: role,
    p_is_active: isActive,
  });
}

export function adminDeleteNote(token: string, id: string) {
  return rpc<null>('admin_delete_note', { p_token: token, p_id: id });
}

export function listHandwritingGlyphs(token: string) {
  return rpc<HandwritingGlyph[] | null>('list_handwriting_glyphs', { p_token: token }).then(
    (rows) => rows ?? []
  );
}

export async function getHandwritingGlyph(token: string, letter: string) {
  const resolved = resolveTurkishLetter(letter);
  if (!resolved) return null;

  const data = await rpc<HandwritingGlyph | HandwritingGlyph[] | null>('get_handwriting_glyph', {
    p_token: token,
    p_letter: resolved,
  });
  const glyph = Array.isArray(data) ? data[0] : data;
  return glyph ?? null;
}

export function upsertHandwritingGlyph(token: string, letter: string, strokeData: Stroke[]) {
  const resolved = resolveTurkishLetter(letter);
  if (!resolved) {
    return Promise.reject(new Error('Geçerli bir harf seçin.'));
  }

  return rpc<HandwritingGlyph>('upsert_handwriting_glyph', {
    p_token: token,
    p_letter: resolved,
    p_stroke_data: strokeData,
  });
}

export function deleteHandwritingGlyph(token: string, letter: string) {
  const resolved = resolveTurkishLetter(letter);
  if (!resolved) {
    return Promise.reject(new Error('Geçerli bir harf seçin.'));
  }

  return rpc<null>('delete_handwriting_glyph', { p_token: token, p_letter: resolved });
}
