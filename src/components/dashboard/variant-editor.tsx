"use client";

import { useState } from "react";

export type Variant = {
  name: string;
  options: Record<string, string>;
  price: number | null;
  sku: string | null;
  stockQuantity: number;
};

type OptionGroup = { name: string; valuesInput: string };

function cartesian(groups: { name: string; values: string[] }[]): Record<string, string>[] {
  return groups.reduce<Record<string, string>[]>(
    (acc, group) => acc.flatMap((combo) => group.values.map((value) => ({ ...combo, [group.name]: value }))),
    [{}]
  );
}

export function VariantEditor({
  initialVariants,
  basePrice,
  onChange,
}: {
  initialVariants: Variant[];
  basePrice: number;
  onChange: (variants: Variant[]) => void;
}) {
  const [groups, setGroups] = useState<OptionGroup[]>([{ name: "Size", valuesInput: "" }]);
  const [variants, setVariants] = useState<Variant[]>(initialVariants);

  function updateVariants(next: Variant[]) {
    setVariants(next);
    onChange(next);
  }

  function generate() {
    const parsedGroups = groups
      .filter((g) => g.name.trim() && g.valuesInput.trim())
      .map((g) => ({
        name: g.name.trim(),
        values: g.valuesInput
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean),
      }));
    if (parsedGroups.length === 0) return;

    const combos = cartesian(parsedGroups);
    const next = combos.map((options) => {
      const name = Object.values(options).join(" / ");
      const existing = variants.find((v) => v.name === name);
      return (
        existing ?? {
          name,
          options,
          price: basePrice,
          sku: null,
          stockQuantity: 0,
        }
      );
    });
    updateVariants(next);
  }

  function updateVariant(index: number, patch: Partial<Variant>) {
    const next = variants.map((v, i) => (i === index ? { ...v, ...patch } : v));
    updateVariants(next);
  }

  function removeVariant(index: number) {
    updateVariants(variants.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Options</label>
        <div className="mt-1 space-y-2">
          {groups.map((group, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text"
                value={group.name}
                onChange={(e) => setGroups(groups.map((g, gi) => (gi === i ? { ...g, name: e.target.value } : g)))}
                placeholder="Option name (e.g. Size)"
                className="w-40 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
              />
              <input
                type="text"
                value={group.valuesInput}
                onChange={(e) => setGroups(groups.map((g, gi) => (gi === i ? { ...g, valuesInput: e.target.value } : g)))}
                placeholder="Values, comma separated (e.g. S, M, L)"
                className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
              />
              <button
                type="button"
                onClick={() => setGroups(groups.filter((_, gi) => gi !== i))}
                className="text-sm text-red-600"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-3">
          <button
            type="button"
            onClick={() => setGroups([...groups, { name: "", valuesInput: "" }])}
            className="text-sm font-medium text-gray-600 hover:underline"
          >
            + Add option
          </button>
          <button
            type="button"
            onClick={generate}
            className="text-sm font-medium text-gray-900 underline"
          >
            Generate combinations
          </button>
        </div>
      </div>

      {variants.length > 0 && (
        <table className="w-full text-sm">
          <thead className="text-left text-xs font-medium uppercase text-gray-500">
            <tr>
              <th className="py-2 pr-2">Variant</th>
              <th className="py-2 pr-2">Price</th>
              <th className="py-2 pr-2">SKU</th>
              <th className="py-2 pr-2">Stock</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {variants.map((v, i) => (
              <tr key={v.name}>
                <td className="py-2 pr-2 font-medium text-gray-700">{v.name}</td>
                <td className="py-2 pr-2">
                  <input
                    type="number"
                    step="0.01"
                    value={v.price ?? ""}
                    onChange={(e) => updateVariant(i, { price: e.target.value ? Number(e.target.value) : null })}
                    className="w-24 rounded-md border border-gray-300 px-2 py-1"
                  />
                </td>
                <td className="py-2 pr-2">
                  <input
                    type="text"
                    value={v.sku ?? ""}
                    onChange={(e) => updateVariant(i, { sku: e.target.value || null })}
                    className="w-28 rounded-md border border-gray-300 px-2 py-1"
                  />
                </td>
                <td className="py-2 pr-2">
                  <input
                    type="number"
                    value={v.stockQuantity}
                    onChange={(e) => updateVariant(i, { stockQuantity: Number(e.target.value) })}
                    className="w-20 rounded-md border border-gray-300 px-2 py-1"
                  />
                </td>
                <td className="py-2">
                  <button type="button" onClick={() => removeVariant(i)} className="text-red-600">
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
