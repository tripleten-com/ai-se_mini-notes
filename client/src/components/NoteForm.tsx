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

  function handleTextChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleTagsChange(event: ChangeEvent<HTMLInputElement>) {
    const tags = event.target.value
      .split(",")
      .map((tag) => tag.trim())
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
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
        <input name="title" value={form.title} onChange={handleTextChange} />
      </label>
      <label>
        Body
        <textarea name="body" value={form.body} onChange={handleTextChange} />
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
        <input value={form.tags.join(", ")} onChange={handleTagsChange} />
      </label>
      {error && <p role="alert">{error}</p>}
      <button type="submit">Create note</button>
    </form>
  );
}

export default NoteForm;
