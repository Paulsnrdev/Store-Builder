"use client";

import { useActionState, useState } from "react";
import { SingleImageUploader } from "@/components/dashboard/image-uploader";
import type { CategoryFormState } from "@/lib/actions/categories";

type Action = (prev: CategoryFormState, formData: FormData) => Promise<CategoryFormState>;

export function CategoryForm({
  action,
  initial,
}: {
  action: Action;
  initial?: { name: string; imageUrl: string | null; sortOrder: number };
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [imageUrl, setImageUrl] = useState<string | null>(initial?.imageUrl ?? null);

  return (
    <form action={formAction} className="max-w-md space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Name</label>
        <input
          name="name"
          type="text"
          required
          defaultValue={initial?.name}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <SingleImageUploader value={imageUrl} onChange={setImageUrl} />
      <input type="hidden" name="imageUrl" value={imageUrl ?? ""} />

      <div>
        <label className="block text-sm font-medium text-gray-700">Sort order</label>
        <input
          name="sortOrder"
          type="number"
          defaultValue={initial?.sortOrder ?? 0}
          className="mt-1 w-32 rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {pending ? "Saving..." : "Save category"}
      </button>
    </form>
  );
}
