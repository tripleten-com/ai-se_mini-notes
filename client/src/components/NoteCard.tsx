import type { Note } from "../../../shared/types";

// TODO: Chapter 2 Lesson 1 - Create a NoteCardProps type and apply it to the component parameter.

function NoteCard({ note, onArchive }: any) {
  return (
    <article className="note-card">
      <div className="note-card__meta">
        {note.visibility} · {note.tags.join(", ") || "untagged"}
      </div>
      <h2>{note.title}</h2>
      <p>{note.body}</p>
      {onArchive && !note.archived && (
        <button type="button" onClick={() => onArchive(note.id)}>
          Archive
        </button>
      )}
    </article>
  );
}

export default NoteCard;
