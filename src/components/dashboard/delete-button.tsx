"use client";

export function DeleteButton({ action, label = "Delete" }: { action: () => Promise<void>; label?: string }) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm("Are you sure? This cannot be undone.")) e.preventDefault();
      }}
    >
      <button type="submit" className="text-sm font-medium text-red-600 hover:underline">
        {label}
      </button>
    </form>
  );
}
