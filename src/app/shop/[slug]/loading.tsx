export default function StorefrontLoading() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse space-y-4 px-4 py-6">
      <div className="h-6 w-40 rounded bg-gray-200" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="h-48 rounded bg-gray-200" />
        <div className="h-48 rounded bg-gray-200" />
        <div className="h-48 rounded bg-gray-200" />
      </div>
    </div>
  );
}
