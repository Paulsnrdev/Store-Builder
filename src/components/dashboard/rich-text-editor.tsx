"use client";

import { useRef } from "react";

const commands: { label: string; command: string; value?: string }[] = [
  { label: "B", command: "bold" },
  { label: "I", command: "italic" },
  { label: "• List", command: "insertUnorderedList" },
  { label: "1. List", command: "insertOrderedList" },
];

export function RichTextEditor({ name, defaultValue }: { name: string; defaultValue?: string | null }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function sync() {
    if (inputRef.current && editorRef.current) {
      inputRef.current.value = editorRef.current.innerHTML;
    }
  }

  function exec(command: string) {
    document.execCommand(command);
    editorRef.current?.focus();
    sync();
  }

  return (
    <div>
      <div className="flex gap-1 rounded-t-md border border-b-0 border-gray-300 bg-gray-50 p-1">
        {commands.map((c) => (
          <button
            key={c.command}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => exec(c.command)}
            className="rounded px-2 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200"
          >
            {c.label}
          </button>
        ))}
      </div>
      <div
        ref={editorRef}
        contentEditable
        onInput={sync}
        onBlur={sync}
        suppressContentEditableWarning
        dangerouslySetInnerHTML={{ __html: defaultValue ?? "" }}
        className="min-h-[120px] rounded-b-md border border-gray-300 px-3 py-2 text-sm transition-colors focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
      />
      <input ref={inputRef} type="hidden" name={name} defaultValue={defaultValue ?? ""} />
    </div>
  );
}
