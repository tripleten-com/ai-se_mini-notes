import type { Request, Response } from "express";
import type { ApiResponse, CreateNotePayload, Note } from "../../../shared/types";
import * as noteService from "../services/noteService";

// TODO: Chapter 2 Lesson 6 - strengthen these route contracts with params, body, and response types.
type CreateNoteRequest = Request;
type UpdateNoteRequest = Request;

export async function getNotes(_req: Request, res: Response) {
  const notes = await noteService.listNotes();
  res.json({ data: notes });
}

export async function postNote(req: CreateNoteRequest, res: Response<ApiResponse<Note>>) {
  const note = await noteService.createNote(req.body);
  res.status(201).json({ data: note });
}

export async function patchNote(req: UpdateNoteRequest, res: Response) {
  const note = await noteService.updateNote(req.params.noteId, req.body);

  if (!note) {
    res.status(404).json({ data: { message: "Note not found" } });
    return;
  }

  res.json({ data: note });
}
