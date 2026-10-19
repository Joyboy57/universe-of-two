"use client";

export function ConfirmButton({ message, children, className = "btn btn-quiet w-full" }: { message: string; children: React.ReactNode; className?: string }) {
  return (
    <button className={className} onClick={(e) => { if (!confirm(message)) e.preventDefault(); }}>
      {children}
    </button>
  );
}
