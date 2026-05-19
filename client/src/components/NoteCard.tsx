import type { Note } from "../../../shared/types";
import CommentList from "./CommentList";

type NoteCardProps = {
  note: Note;
  onArchive?: (noteId: string) => void;
};

function NoteCard({ note, onArchive }: NoteCardProps) {
  return (
    <article className="note-card">
      <div className="note-card__meta">
        {note.visibility} · {note.tags.join(", ") || "untagged"}
      </div>
      <h2>{note.title}</h2>
      <p>{note.body}</p>
      {note.pinned && <strong>Pinned</strong>}
      <CommentList comments={note.comments} />
      {onArchive && !note.archived && (
        <button type="button" onClick={() => onArchive(note.id)}>
          Archive
        </button>
      )}
    </article>
  );
}

export default NoteCard;
