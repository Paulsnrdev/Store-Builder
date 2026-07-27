import Link from "next/link";

export default function StoreNotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold text-gray-900">Store not found</h1>
      <p className="mt-2 text-sm text-gray-500">This store doesn&apos;t exist or isn&apos;t published yet.</p>
      <Link href="/" className="mt-6 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">
        Go home
      </Link>
    </div>
  );
}
