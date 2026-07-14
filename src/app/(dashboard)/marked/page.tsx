import { Bookmark } from "lucide-react";
import { PostCard } from "@/components/posts/post-card";
import { Badge } from "@/components/ui/badge";
import {
  competitorKey,
  getCompetitorKeySet,
  getMarkedPosts,
} from "@/lib/data";

export default async function MarkedPage() {
  const posts = await getMarkedPosts();
  const competitorKeys = await getCompetitorKeySet();

  return (
    <main className="flex min-w-0 flex-1 flex-col gap-5 p-4 md:p-6">
      <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm text-zinc-500">Saved ideas</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal text-zinc-50">
            Marked
          </h1>
        </div>
        <Badge tone="blue">
          <Bookmark className="mr-1 h-3.5 w-3.5" />
          {posts.length} saved
        </Badge>
      </header>

      {posts.length ? (
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {posts.map((post) => (
            <div key={post.id} className="space-y-2">
              <PostCard
                post={post}
                view="list"
                isCompetitor={competitorKeys.has(
                  competitorKey(post.source, post.authorHandle),
                )}
              />
              <div className="rounded-md border border-zinc-850 bg-zinc-900 px-3 py-2 text-xs text-zinc-500">
                Status: {post.status} · Marked{" "}
                {new Intl.DateTimeFormat("en-HK", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                }).format(new Date(post.markedAt))}
              </div>
            </div>
          ))}
        </section>
      ) : (
        <section className="rounded-lg border border-zinc-850 bg-zinc-900 p-8 text-center text-sm text-zinc-500">
          No marked posts yet.
        </section>
      )}
    </main>
  );
}
