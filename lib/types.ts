export type Role = 'user' | 'admin';

export type Profile = {
  id: string;
  username: string;
  role: Role;
  is_active: boolean;
  created_at: string;
};

export type Note = {
  id: string;
  user_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  profiles?: { username: string } | { username: string }[] | null;
};

export function noteAuthor(note: Note) {
  if (!note.profiles) return undefined;
  if (Array.isArray(note.profiles)) return note.profiles[0]?.username;
  return note.profiles.username;
}

export type ProfileWithNotes = Profile & {
  notes?: { count: number }[];
};
