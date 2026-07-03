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
  visibility: string;
  ownerId: string;
  tags: string[];
  comments: NoteComment[];
  archived: boolean;
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
