"use client";

export function DeleteButton() {
  return (
    <button
      className="btn btn-quiet w-full"
      onClick={(ev) => {
        if (!confirm("Delete this date for both of you? This can't be undone.")) ev.preventDefault();
      }}
    >
      Delete
    </button>
  );
}
