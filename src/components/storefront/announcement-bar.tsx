export function AnnouncementBar({ text }: { text: string }) {
  return (
    <div className="bg-(--store-primary) px-4 py-2 text-center text-xs font-medium text-white">{text}</div>
  );
}
