"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { uploadImage } from "@/lib/actions/upload";

export function SingleImageUploader({
  value,
  onChange,
  label = "Image",
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  label?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.set("file", file);
    const result = await uploadImage(formData);
    setUploading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.url) onChange(result.url);
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="mt-1 flex items-center gap-3">
        {value ? (
          <div className="relative h-20 w-20 overflow-hidden rounded-md border border-gray-200">
            <Image src={value} alt="" fill className="object-cover" />
          </div>
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-md border border-dashed border-gray-300 text-xs text-gray-400">
            No image
          </div>
        )}
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {uploading ? "Uploading..." : value ? "Replace" : "Upload"}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="block text-xs text-red-600 hover:underline"
            >
              Remove
            </button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export type ProductImageItem = { url: string; altText?: string };

export function MultiImageUploader({
  images,
  onChange,
}: {
  images: ProductImageItem[];
  onChange: (images: ProductImageItem[]) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList) {
    setUploading(true);
    setError(null);
    const uploaded: ProductImageItem[] = [];
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.set("file", file);
      const result = await uploadImage(formData);
      if (result.error) {
        setError(result.error);
        continue;
      }
      if (result.url) uploaded.push({ url: result.url });
    }
    setUploading(false);
    onChange([...images, ...uploaded]);
  }

  function removeAt(index: number) {
    onChange(images.filter((_, i) => i !== index));
  }

  function handleDrop(index: number) {
    if (dragIndex === null || dragIndex === index) return;
    const next = [...images];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(index, 0, moved);
    setDragIndex(null);
    onChange(next);
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">Images</label>
      <p className="text-xs text-gray-400">Drag to reorder. First image is the cover.</p>
      <div className="mt-2 flex flex-wrap gap-3">
        {images.map((img, index) => (
          <div
            key={img.url + index}
            draggable
            onDragStart={() => setDragIndex(index)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(index)}
            className="relative h-20 w-20 cursor-move overflow-hidden rounded-md border border-gray-200"
          >
            <Image src={img.url} alt="" fill className="object-cover" />
            <button
              type="button"
              onClick={() => removeAt(index)}
              className="absolute right-0.5 top-0.5 rounded-full bg-black/60 px-1.5 text-xs text-white"
            >
              ×
            </button>
            {index === 0 && (
              <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-center text-[10px] text-white">
                Cover
              </span>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex h-20 w-20 items-center justify-center rounded-md border border-dashed border-gray-300 text-xs text-gray-400 hover:bg-gray-50 disabled:opacity-50"
        >
          {uploading ? "..." : "+ Add"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
