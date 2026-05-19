import type { HydratedDocument } from "mongoose";
import type { Note } from "../../../shared/types";
import type { NoteDocument } from "../models/Note";

export function mapNote(document: HydratedDocument<NoteDocument>): Note {
  return {
    id: document._id.toString(),
    title: document.title,
    body: document.body,
    // TODO: Chapter 3 Lesson 2 - verify mapped fields match the shared Note contract.
    visibility: String(document.visibility),
    ownerId: document.ownerId.toString(),
    tags: document.tags,
    comments: document.comments.map((comment) => ({
      ...comment,
      // TODO: Chapter 3 Lesson 6 - map nested values to the shared type, not persistence quirks.
      resolved: Boolean(comment.resolved)
    })),
    archived: document.archived,
    pinned: Boolean(document.pinned),
    // TODO: Chapter 3 Lesson 5 - expose dates in the shared API format intentionally.
    createdAt: String(document.createdAt),
    updatedAt: document.updatedAt.toISOString()
  };
}
