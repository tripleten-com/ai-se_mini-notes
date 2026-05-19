import { useEffect, useMemo, useState } from "react";
import type { CreateNotePayload, Note } from "../../../shared/types";
import NoteCard from "../components/NoteCard";
import NoteForm from "../components/NoteForm";
import { useAuth } from "../context/AuthContext";
import { archiveNote, createNote, listNotes } from "../services/noteService";

function NotesPage() {
  const { currentUser, lastActionRef } = useAuth();
  // TODO: Chapter 2 Lesson 2 - tighten these hook types instead of relying on broad values.
  const [notes, setNotes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null as any);

  const activeNotes = useMemo(
    () => notes.filter((note) => !note.archived),
    [notes]
  );

  async function loadNotes() {
    setIsLoading(true);
    setError(null);

    try {
      const result = await listNotes();
      setNotes(result.items);
    } catch {
      setError("Unable to load notes.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateNote(payload: CreateNotePayload) {
    const note = await createNote(payload);
    setNotes((current) => [note, ...current]);
    lastActionRef.current = `created:${note.id}`;
  }

  async function handleArchiveNote(noteId: string) {
    const updated = await archiveNote(noteId);
    setNotes((current) =>
      current.map((note) => (note.id === updated.id ? updated : note))
    );
    lastActionRef.current = `archived:${updated.id}`;
  }

  useEffect(() => {
    void loadNotes();
  }, []);

  return (
    <main className="page">
      <h1>Mini Notes</h1>
      <p>Signed in as {currentUser.name}</p>
      <NoteForm onSubmit={handleCreateNote} />
      {isLoading && <p>Loading notes...</p>}
      {error && <p role="alert">{error}</p>}
      {!isLoading && !error && activeNotes.length === 0 && (
        <p>No active notes yet.</p>
      )}
      <section className="note-grid" aria-label="Active notes">
        {activeNotes.map((note) => (
          <NoteCard
            key={note.id}
            note={note}
            onArchive={handleArchiveNote}
          />
        ))}
      </section>
    </main>
  );
}

export default NotesPage;
