import type { ChangeEvent, FormEvent } from "react";
import { useState } from "react";
import type { CreateNotePayload, NoteVisibility } from "../../../shared/types";
import VisibilitySelect from "./VisibilitySelect";

type NoteFormState = CreateNotePayload;

type NoteFormProps = {
  onSubmit: (payload: CreateNotePayload) => Promise<void>;
};

const initialFormState: NoteFormState = {
  title: "",
  body: "",
  visibility: "team",
  tags: [],
};

function NoteForm({ onSubmit }: NoteFormProps) {
  const [form, setForm] = useState<NoteFormState>(initialFormState);
  const [error, setError] = useState<string | null>(null);

  // TODO: Chapter 2 Lesson 2 - replace broad event typing with the correct React event type.
  function handleTextChange(event: any) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  // TODO: Chapter 2 Lesson 2 - type this input event without using any.
  function handleTagsChange(event: any) {
    const tags = event.target.value
      .split(",")
      .map((tag: string) => tag.trim())
      .filter(Boolean);

    setForm((current) => ({
      ...current,
      tags,
    }));
  }

  function handleVisibilityChange(visibility: NoteVisibility) {
    setForm((current) => ({
      ...current,
      visibility,
    }));
  }

  // TODO: Chapter 2 Lesson 2 - type this form event without using any.
  async function handleSubmit(event: any) {
    event.preventDefault();

    if (form.title.trim().length < 3) {
      setError("Title must be at least 3 characters.");
      return;
    }

    setError(null);
    await onSubmit({
      ...form,
      title: form.title.trim(),
      body: form.body.trim(),
    });
    setForm(initialFormState);
  }

  return (
    <form className="note-form" onSubmit={handleSubmit}>
      <label>
        Title
        <input
          name="title"
          value={form.title}
          onChange={handleTextChange}
          placeholder="Enter title..."
        />
      </label>
      <label>
        Body
        <textarea
          placeholder="Enter note body..."
          name="body"
          value={form.body}
          onChange={handleTextChange}
        />
      </label>
      <label>
        Visibility
        <VisibilitySelect
          value={form.visibility as NoteVisibility}
          onChange={handleVisibilityChange}
        />
      </label>
      <label>
        Tags
        <input
          value={form.tags.join(", ")}
          onChange={handleTagsChange}
          placeholder="e.g. typescript, contracts"
        />
      </label>
      {error && <p role="alert">{error}</p>}
      <button type="submit">Create note</button>
    </form>
  );
}

export default NoteForm;
