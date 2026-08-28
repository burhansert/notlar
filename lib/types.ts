export type Role = 'user' | 'admin';

export type Profile = {
  id: string;
  email: string;
  role: Role;
  is_active: boolean;
  created_at: string;
};

export type AppSession = {
  token: string;
  user: Profile;
};

export type Notebook = {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  section_count?: number;
  note_count?: number;
  is_locked?: boolean;
};

export type Section = {
  id: string;
  notebook_id: string;
  title: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  note_count?: number;
};

export type NoteListContext = 'notebooks' | 'sections';

export type Note = {
  id: string;
  user_id: string;
  section_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  notebook_id?: string | null;
  list_context?: NoteListContext | null;
  author_email?: string | null;
  notebook_title?: string | null;
  section_title?: string | null;
};

export type ProfileWithNotes = Profile & {
  note_count: number;
  notebook_count: number;
};

export type StrokePoint = {
  x: number;
  y: number;
};

export type Stroke = StrokePoint[];

export type HandwritingGlyph = {
  id: string;
  user_id: string;
  letter: string;
  stroke_data: Stroke[];
  created_at: string;
  updated_at: string;
};

export function noteAuthor(note: Note) {
  return note.author_email ?? undefined;
}
