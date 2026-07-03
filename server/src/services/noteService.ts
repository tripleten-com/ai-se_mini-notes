import { Types } from "mongoose";
import type {
  CreateNotePayload,
  Note,
  Paginated,
  UpdateNotePayload,
} from "../../../shared/types";
import { mapNote } from "../mappers/noteMapper";
import { NoteModel } from "../models/Note";
import { paginate } from "../utils/paginate";

const demoOwnerId = new Types.ObjectId("64a000000000000000000001");

export async function listNotes(): Promise<Paginated<Note>> {
  const documents = await NoteModel.find().sort({ updatedAt: -1 });
  return paginate(documents.map(mapNote), documents.length);
}

export async function createNote(payload: CreateNotePayload): Promise<Note> {
  if (payload.title.trim().length < 3) {
    throw new Error("Title must be at least 3 characters.");
  }

  const document = await NoteModel.create({
    ...payload,
    ownerId: demoOwnerId,
  });

  return mapNote(document);
}

export async function updateNote(
  noteId: string,
  payload: UpdateNotePayload,
): Promise<Note | null> {
  const document = await NoteModel.findByIdAndUpdate(noteId, payload, {
    new: true,
    runValidators: true,
  });

  return document ? mapNote(document) : null;
}
