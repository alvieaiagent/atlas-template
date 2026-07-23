"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";
import { SourceIcon } from "@/components/posts/source-icon";
import { proxiedImage } from "@/lib/image-proxy";
import type { Post } from "@/lib/types";

type PostThumbnailProps = {
  post: Post;
  media: Post["media"][number];
  view: "grid" | "list";
};

export function PostThumbnail({ post, media, view }: PostThumbnailProps) {
  const [failed, setFailed] = useState(false);
  const wrapperClass = view === "list" ? "relative aspect-[4/5] bg-slate-100 md:aspect-auto md:min-h-full" : "relative aspect-[4/5] shrink-0 bg-slate-100";

  if (failed) {
    return (
      <div className={`${wrapperClass} flex flex-col items-center justify-center gap-2 border-b border-slate-200 p-4 text-center text-slate-500`}>
        <ImageOff className="h-8 w-8 text-slate-300" />
        <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-600">
          <SourceIcon source={post.source} className="h-3.5 w-3.5" />
          Thumbnail unavailable
        </div>
        <p className="line-clamp-3 text-xs leading-5">External social thumbnails expire, so Atlas keeps the card text and link instead of showing a broken image.</p>
      </div>
    );
  }

  return (
    <div className={wrapperClass}>
      {media.type === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt=""
          className="h-full w-full object-cover"
          src={proxiedImage(media.url)}
          onError={() => setFailed(true)}
        />
      ) : (
        <video
          className="h-full w-full object-cover"
          src={media.url}
          controls
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
