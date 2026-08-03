"use client";

import { useActionState, useState } from "react";
import { SingleImageUploader } from "@/components/dashboard/image-uploader";
import type { CategoryFormState } from "@/lib/actions/categories";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
        <Input name="name" type="text" required defaultValue={initial?.name} className="mt-1" />
      </div>

      <SingleImageUploader value={imageUrl} onChange={setImageUrl} />
      <input type="hidden" name="imageUrl" value={imageUrl ?? ""} />

      <div>
        <label className="block text-sm font-medium text-gray-700">Sort order</label>
        <Input name="sortOrder" type="number" defaultValue={initial?.sortOrder ?? 0} className="mt-1 w-32" />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save category"}
      </Button>
    </form>
  );
}
