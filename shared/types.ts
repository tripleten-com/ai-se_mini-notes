export const NOTE_VISIBILITIES = ["private", "team", "public"] as const;

export type NoteVisibility = (typeof NOTE_VISIBILITIES)[number];

export type User = {
  id: string;
  name: string;
  email: string;
};

export type NoteComment = {
  id: string;
  body: string;
  authorId: string;
  createdAt: string;
};

export type Note = {
  id: string;
  title: string;
  body: string;
  visibility: NoteVisibility;
  ownerId: string;
  tags: string[];
  comments: NoteComment[];
  archived: boolean;
  pinned?: boolean;
  createdAt: string;
  updatedAt: string;
};

// TODO: Chapter 2 Lesson 5 - derive this payload from Note instead of duplicating fields.
export type CreateNotePayload = {
  title: string;
  body: string;
  visibility: NoteVisibility;
  tags: string[];
};

// TODO: Chapter 2 Lesson 5 - derive update payloads from create payloads.
export type UpdateNotePayload = {
  title?: string;
  body?: string;
  visibility?: NoteVisibility;
  tags?: string[];
  archived?: boolean;
  pinned?: boolean;
};

export type ApiResponse<T> = {
  data: T;
};

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};
