import { Schema, model, Types } from "mongoose";
import { NOTE_VISIBILITIES } from "../../../shared/types";
import type { NoteComment, NoteVisibility } from "../../../shared/types";

export type NoteDocument = {
  title: string;
  body: string;
  visibility: NoteVisibility;
  ownerId: Types.ObjectId;
  tags: string[];
  comments: NoteComment[];
  archived: boolean;
  pinned?: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const commentSchema = new Schema<NoteComment>(
  {
    id: {
      type: String,
      required: true
    },
    body: {
      type: String,
      required: true,
      trim: true
    },
    authorId: {
      type: String,
      required: true
    },
    createdAt: {
      type: String,
      required: true
    },
    resolved: {
      // TODO: Chapter 3 Lesson 6 - align this nested schema field with the shared comment type.
      type: String,
      default: "false"
    }
  },
  {
    _id: false
  }
);

const noteSchema = new Schema<NoteDocument>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3
    },
    body: {
      type: String,
      required: true,
      trim: true
    },
    visibility: {
      type: String,
      // TODO: Chapter 3 Lesson 4 - align the schema enum with shared constrained values.
      default: "team",
      required: true
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    tags: {
      type: [String],
      default: []
    },
    comments: {
      type: [commentSchema],
      default: []
    },
    archived: {
      type: Boolean,
      default: false
    },
    pinned: {
      // TODO: Chapter 3 Lesson 8 - keep this feature field compatible with existing records.
      type: String,
      default: "false"
    }
  },
  {
    timestamps: true
  }
);

export const NoteModel = model<NoteDocument>("Note", noteSchema);
