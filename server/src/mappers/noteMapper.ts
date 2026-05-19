import type { HydratedDocument } from "mongoose";
import type { Note } from "../../../shared/types";
import type { NoteDocument } from "../models/Note";

export function mapNote(document: HydratedDocument<NoteDocument>): Note {
  return {
    id: document._id.toString(),
    title: document.title,
    body: document.body,
    visibility: document.visibility,
    ownerId: document.ownerId.toString(),
    tags: document.tags,
    comments: document.comments,
    archived: document.archived,
    pinned: document.pinned,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString()
  };
}
