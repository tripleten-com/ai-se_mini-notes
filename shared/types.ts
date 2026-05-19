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
  // TODO: Chapter 3 Lesson 6 - extend this nested object safely without changing unrelated fields.
  createdAt: string;
  resolved?: boolean;
};

export type Note = {
  id: string;
  title: string;
  body: string;
  // TODO: Chapter 3 Lesson 4 - constrain visibility to the shared NoteVisibility union.
  visibility: string;
  ownerId: string;
  tags: string[];
  comments: NoteComment[];
  archived: boolean;
  // TODO: Chapter 3 Lesson 8 - decide whether pinned belongs in the model and keep it compatible.
  pinned?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateNotePayload = Pick<
  Note,
  "title" | "body" | "visibility" | "tags"
>;

export type UpdateNotePayload = Partial<CreateNotePayload> & {
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
