import type { ChangeEvent } from "react";
import { NOTE_VISIBILITIES } from "../../../shared/types";
import type { NoteVisibility } from "../../../shared/types";

type VisibilitySelectProps = {
  value: NoteVisibility;
  onChange: (visibility: NoteVisibility) => void;
};

function isNoteVisibility(value: string): value is NoteVisibility {
  return NOTE_VISIBILITIES.includes(value as NoteVisibility);
}

function VisibilitySelect({ value, onChange }: VisibilitySelectProps) {
  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextValue = event.target.value;

    if (isNoteVisibility(nextValue)) {
      onChange(nextValue);
    }
  }

  return (
    <select value={value} onChange={handleChange}>
      {NOTE_VISIBILITIES.map((visibility) => (
        <option key={visibility} value={visibility}>
          {visibility}
        </option>
      ))}
    </select>
  );
}

export default VisibilitySelect;
