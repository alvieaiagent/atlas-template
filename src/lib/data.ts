import { unstable_noStore as noStore } from "next/cache";
import { mockCategories, mockMarkedPosts, mockPosts } from "@/lib/mock-data";
import { mapCategory, mapPost } from "@/lib/mappers";
// Single-user localhost tool: data reads go through the service-role client so the app
// works without a login session. (Pre-public-deploy TODO: switch back to the authenticated
// client + per-user RLS.)
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { NOISE_RE } from "@/lib/scraping/feeds-free";
import type {
  Category,
  Competitor,
  MarkedPost,
  Post,
  Purpose,
  Source,
  TimeFilter,
} from "@/lib/types";

export type CompetitorRow = Competitor & { postCount: number };

export type PostFilters = {
  categoryId?: string;
  keyword?: string;
  time?: TimeFilter;
  source?: Source[];
  view?: string;
};

function getTimeLowerBound(time: TimeFilter | undefined): string | null {
  const now = Date.now();

  switch (time) {
    case "4h":
      return new Date(now - 1000 * 60 * 60 * 4).toISOString();
    case "24h":
      return new Date(now - 1000 * 60 * 60 * 24).toISOString();
    case "48h":
      return new Date(now - 1000 * 60 * 60 * 48).toISOString();
    case "7d":
      return new Date(now - 1000 * 60 * 60 * 24 * 7).toISOString();
    case "all":
    case undefined:
      return null;
  }
}

export async function getCategories(): Promise<Category[]> {
  noStore();
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return mockCategories;
  }

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data.map(mapCategory);
}

export async function getPosts(filters: PostFilters): Promise<Post[]> {
  noStore();
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return filterMockPosts(filters);
  }

  let query = supabase
    .from("posts")
    .select("*")
    .order("posted_at", { ascending: false })
    .limit(100);

  const lowerBound = getTimeLowerBound(filters.time);
  if (lowerBound) {
    query = query.gte("posted_at", lowerBound);
  }

  if (filters.categoryId) {
    query = query.contains("category_ids", [filters.categoryId]);
  }

  if (filters.source && filters.source.length > 0) {
    query = query.in("source", filters.source);
  }

  const { data: posts, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  const { data: markedRows, error: markedError } = await supabase
    .from("marked_posts")
    .select("post_id");

  if (markedError) {
    throw new Error(markedError.message);
  }

  const markedIds = new Set(markedRows.map((row) => row.post_id));
  const mapped = posts.map((post) => mapPost(post, markedIds));

  if (!filters.keyword) {
    return mapped;
  }

  return mapped.filter((post) =>
    post.text.toLowerCase().includes(filters.keyword!.toLowerCase()),
  );
}

export type RadarFilters = {
  radarCategory?: string;
  time?: TimeFilter;
  savedOnly?: boolean;
};

// 🛰️ Twitter→Thread column feed: auto-scraped X posts in the radar lane
// (added_via='scrape' + categories with sortOrder >= 100). Kept separate from
// getPosts (manual library) so radar noise never mixes into Library/Inspiration.
export async function getRadarPosts(filters: RadarFilters = {}): Promise<Post[]> {
  noStore();
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return [];
  }

  const categories = await getCategories();
  const radarIds = categories
    .filter((category) => category.sortOrder >= 100)
    .map((category) => category.id);
  if (radarIds.length === 0) {
    return [];
  }

  const scopeIds =
    filters.radarCategory && radarIds.includes(filters.radarCategory)
      ? [filters.radarCategory]
      : radarIds;

  // Saved (marked) ids — used for both the display flag and the 「收藏」tab.
  const { data: markedRows, error: markedError } = await supabase
    .from("marked_posts")
    .select("post_id");
  if (markedError) {
    throw new Error(markedError.message);
  }
  const markedIds = new Set(markedRows.map((row) => row.post_id));

  let query = supabase
    .from("posts")
    .select("*")
    .eq("added_via", "scrape")
    .overlaps("category_ids", scopeIds)
    .order("posted_at", { ascending: false })
    .limit(100);

  if (filters.savedOnly) {
    // 「收藏」= permanent, no time window.
    if (markedIds.size === 0) {
      return [];
    }
    query = query.in("id", [...markedIds]);
  } else {
    // 「最新」= ephemeral fresh feed (default 48h).
    const lowerBound = getTimeLowerBound(filters.time);
    if (lowerBound) {
      query = query.gte("posted_at", lowerBound);
    }
  }

  const { data: posts, error } = await query;
  if (error) {
    throw new Error(error.message);
  }
  // Show only curated rows (text carries a `⭐{score}｜…` marker) — this hides
  // legacy un-curated/noisy rows still in the DB — and sort best-first so the
  // most worth-posting items surface at the top.
  const scoreOf = (text: string): number => {
    const m = text.match(/^⭐(\d+)/);
    return m ? Number(m[1]) : -1;
  };
  return posts
    .map((post) => mapPost(post, markedIds))
    .filter((post) => scoreOf(post.text) >= 0 && !NOISE_RE.test(post.text))
    .sort((a, b) => scoreOf(b.text) - scoreOf(a.text));
}

export async function getMarkedPosts(): Promise<MarkedPost[]> {
  noStore();
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return mockMarkedPosts;
  }

  const { data, error } = await supabase
    .from("marked_posts")
    .select(
      "post_id, marked_at, status, notes, posts(*)",
    )
    .order("marked_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data.flatMap((row) => {
    const post = Array.isArray(row.posts) ? row.posts[0] : row.posts;
    if (!post) {
      return [];
    }

    return [
      {
        ...mapPost(post, new Set([row.post_id])),
        markedAt: row.marked_at,
        status: row.status,
        notes: row.notes,
      },
    ];
  });
}

export async function getLibraryPosts(purpose?: Purpose): Promise<Post[]> {
  noStore();
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return [];
  }

  let query = supabase
    .from("posts")
    .select("*")
    .eq("added_via", "manual")
    .order("fetched_at", { ascending: false })
    // Personal library — show everything (was capped at 100, hiding older saves).
    .limit(2000);

  if (purpose) {
    query = query.eq("purpose", purpose);
  }

  const { data: posts, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const { data: markedRows, error: markedError } = await supabase
    .from("marked_posts")
    .select("post_id");

  if (markedError) {
    throw new Error(markedError.message);
  }

  const markedIds = new Set(markedRows.map((row) => row.post_id));
  return posts.map((post) => mapPost(post, markedIds));
}

export async function getCompetitors(): Promise<CompetitorRow[]> {
  noStore();
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return [];
  }

  const { data: comps, error } = await supabase
    .from("competitors")
    .select("*")
    .order("added_at", { ascending: false });
  if (error) {
    throw new Error(error.message);
  }

  const { data: posts } = await supabase
    .from("posts")
    .select("author_handle")
    .eq("added_via", "manual");

  const counts = new Map<string, number>();
  (posts ?? []).forEach((post) => {
    counts.set(post.author_handle, (counts.get(post.author_handle) ?? 0) + 1);
  });

  return comps.map((competitor) => ({
    source: competitor.source,
    handle: competitor.handle,
    name: competitor.name,
    addedAt: competitor.added_at,
    postCount: counts.get(competitor.handle) ?? 0,
  }));
}

/** Stable key for "is this author already a tracked competitor?" lookups. */
export function competitorKey(source: string, handle: string): string {
  return `${source}:${handle.toLowerCase()}`;
}

/** Set of competitor keys so cards can show an "already added" state. */
export async function getCompetitorKeySet(): Promise<Set<string>> {
  noStore();
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return new Set();
  }

  const { data, error } = await supabase
    .from("competitors")
    .select("source, handle");
  if (error) {
    throw new Error(error.message);
  }

  return new Set((data ?? []).map((c) => competitorKey(c.source, c.handle)));
}

function filterMockPosts(filters: PostFilters): Post[] {
  const lowerBound = getTimeLowerBound(filters.time);

  return mockPosts.filter((post) => {
    if (filters.categoryId && !post.categoryIds.includes(filters.categoryId)) {
      return false;
    }

    if (
      filters.source &&
      filters.source.length > 0 &&
      !filters.source.includes(post.source)
    ) {
      return false;
    }

    if (filters.keyword && !post.text.toLowerCase().includes(filters.keyword.toLowerCase())) {
      return false;
    }

    if (lowerBound && post.postedAt < lowerBound) {
      return false;
    }

    return true;
  });
}
