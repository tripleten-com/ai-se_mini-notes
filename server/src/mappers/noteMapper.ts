import type { HydratedDocument } from "mongoose";
import type { Note } from "../../../shared/types";
import type { NoteDocument } from "../models/Note";

export function mapNote(document: HydratedDocument<NoteDocument>): Note {
  return {
    id: document._id.toString(),
    title: document.title,
    body: document.body,
    // TODO: Chapter 3 Lesson 3 - verify mapped fields match the shared Note contract.
    visibility: String(document.visibility),
    ownerId: document.ownerId.toString(),
    tags: document.tags,
    archived: document.archived,
    // TODO: Chapter 3 Lesson 5 - expose dates in the shared API format intentionally.
    createdAt: String(document.createdAt),
    updatedAt: document.updatedAt.toISOString(),
  };
}
