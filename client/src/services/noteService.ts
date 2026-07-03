import type {
  ApiResponse,
  CreateNotePayload,
  Note,
  Paginated,
  UpdateNotePayload,
} from "../../../shared/types";
import { http, unwrapPaginated, unwrapResponse } from "./http";

// TODO: Chapter 2 Lesson 5 - make this async return type match the actual API data.
export async function listNotes(): Promise<any> {
  const response = await http.get<ApiResponse<Paginated<Note>>>("/notes");
  return unwrapPaginated(response.data);
}

export async function createNote(payload: CreateNotePayload): Promise<any> {
  const response = await http.post<ApiResponse<Note>>("/notes", payload);
  return unwrapResponse(response.data);
}

export async function updateNote(
  noteId: string,
  payload: UpdateNotePayload,
): Promise<any> {
  const response = await http.patch<ApiResponse<Note>>(
    `/notes/${noteId}`,
    payload,
  );
  return unwrapResponse(response.data);
}

export async function archiveNote(noteId: string): Promise<Note> {
  return updateNote(noteId, { archived: true });
}
