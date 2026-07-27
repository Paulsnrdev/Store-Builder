"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="mb-6 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 print:hidden"
    >
      Print
    </button>
  );
}
