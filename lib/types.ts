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

export type Note = {
  id: string;
  user_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  author_email?: string | null;
};

export type ProfileWithNotes = Profile & {
  note_count: number;
};

export function noteAuthor(note: Note) {
  return note.author_email ?? undefined;
}
