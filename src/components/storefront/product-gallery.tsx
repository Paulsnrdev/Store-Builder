"use client";

import { useRef, useState } from "react";
import Image from "next/image";

export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [active, setActive] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);

  function onScroll() {
    const el = scrollerRef.current;
    if (!el) return;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    setActive(index);
  }

  if (images.length === 0) {
    return <div className="aspect-square w-full rounded-lg bg-gray-100" />;
  }

  return (
    <div>
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        className="flex aspect-square w-full snap-x snap-mandatory scroll-smooth overflow-x-auto rounded-lg bg-gray-100"
      >
        {images.map((src, i) => (
          <div key={src + i} className="relative h-full w-full shrink-0 snap-center">
            <Image
              src={src}
              alt={name}
              fill
              priority={i === 0}
              sizes="(max-width: 640px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
        ))}
      </div>
      {images.length > 1 && (
        <div className="mt-2 flex justify-center gap-1.5">
          {images.map((_, i) => (
            <span key={i} className={`h-1.5 w-1.5 rounded-full transition-colors duration-200 ${i === active ? "bg-gray-900" : "bg-gray-300"}`} />
          ))}
        </div>
      )}
    </div>
  );
}
