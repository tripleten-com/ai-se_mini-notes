import type { Note } from "../../../shared/types";

// TODO: Chapter 2 Lesson 1 - apply this prop contract to the component parameter.
export type NoteCardProps = {
  note: Note;
  onArchive?: (noteId: string) => void;
};

function NoteCard({ note, onArchive }: any) {
  return (
    <article className="note-card">
      <div className="note-card__meta">
        {note.visibility} · {note.tags.join(", ") || "untagged"}
      </div>
      <h2>{note.title}</h2>
      <p>{note.body}</p>
      {note.pinned && <strong>Pinned</strong>}
      {onArchive && !note.archived && (
        <button type="button" onClick={() => onArchive(note.id)}>
          Archive
        </button>
      )}
    </article>
  );
}

export default NoteCard;
