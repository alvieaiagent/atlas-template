import { describe, expect, it, vi } from "vitest";
import igFixture from "@/lib/scraping/__fixtures__/ig.json";
import malformedFixture from "@/lib/scraping/__fixtures__/malformed.json";
import threadsFixture from "@/lib/scraping/__fixtures__/threads.json";
import xFixture from "@/lib/scraping/__fixtures__/x.json";
import {
  actorBySource,
  buildActorInput,
  normalizeApifyItem,
  normalizeApifyItems,
  type NormalizedPostInsert,
} from "@/lib/scraping/apify";
import type { Source } from "@/lib/types";

const categoryId = "11111111-1111-4111-8111-111111111111";

const cases: { source: Source; fixture: unknown[]; expectedHandle: string }[] = [
  { source: "x", fixture: xFixture, expectedHandle: "anthropicai" },
  { source: "threads", fixture: threadsFixture, expectedHandle: "cursor_ai" },
  { source: "ig", fixture: igFixture, expectedHandle: "buildwithai" },
];

function assertNormalizedShape(item: NormalizedPostInsert, source: Source) {
  expect(item.source).toBe(source);
  expect(item.external_id).toContain(`${source}:`);
  expect(item.posted_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  expect(item.category_ids).toEqual([categoryId]);
  expect(item.text.length).toBeGreaterThan(0);
}

describe("Apify normalizer", () => {
  it("uses search-capable feed actors and valid search inputs", () => {
    expect(actorBySource.x).toBe("khadinakbar/x-twitter-search-scraper");
    expect(actorBySource.threads).toBe("igview-owner/threads-search-scraper");
    expect(actorBySource.ig).toBe("apify/instagram-hashtag-scraper");

    expect(buildActorInput("threads", '"prompt engineering" OR "ai tool"', null)).toMatchObject({
      searchQuery: "prompt engineering OR ai tool",
      sort: "recent",
      maxPages: 1,
    });
    expect(buildActorInput("ig", '"prompt engineering" OR "ai tool"', null)).toMatchObject({
      hashtags: ["promptengineering", "aitool"],
      resultsType: "posts",
      resultsLimit: 10,
    });
  });

  it.each(cases)("normalizes $source fixture", ({ source, fixture, expectedHandle }) => {
    const normalized = normalizeApifyItem(source, categoryId, fixture[0]);

    expect(normalized).not.toBeNull();
    assertNormalizedShape(normalized!, source);
    expect(normalized!.author_handle).toBe(expectedHandle);
  });

  it("skips malformed items without throwing", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const normalized = normalizeApifyItems("threads", categoryId, malformedFixture);

    expect(normalized).toEqual([]);
    expect(warn).toHaveBeenCalledTimes(malformedFixture.length);
    warn.mockRestore();
  });

  it("falls back to a valid posted_at and stable generated external id", () => {
    const normalized = normalizeApifyItem("x", categoryId, {
      fullText: "No id and invalid date, but still normalizable.",
      createdAt: "not-a-date",
      authorHandle: "@fallback_user",
      authorName: "Fallback User",
    });

    expect(normalized).not.toBeNull();
    assertNormalizedShape(normalized!, "x");
    expect(normalized!.external_id).toMatch(/^x:generated:/);
    expect(Number.isNaN(new Date(normalized!.posted_at).getTime())).toBe(false);
  });

  it("normalizes flat Facebook post scraper output", () => {
    const normalized = normalizeApifyItem("facebook", categoryId, {
      postId: "10236089671395163",
      permalink: "https://www.facebook.com/story.php?story_fbid=10236089671395163&id=1026234272",
      pageName: "Example Creator",
      text: "Public Facebook post text",
      timestamp: "2026-06-18T03:00:00.000Z",
      likes: 12,
      comments: 3,
      shares: 2,
      image: "https://scontent.fhkg1-1.fna.fbcdn.net/v/t39.30808-6/example.jpg",
    });

    expect(normalized).not.toBeNull();
    assertNormalizedShape(normalized!, "facebook");
    expect(normalized!.author_name).toBe("Example Creator");
    expect(normalized!.engagement).toMatchObject({ like: 12, comment: 3, share: 2 });
    expect(normalized!.media).toEqual([
      {
        type: "image",
        url: "https://scontent.fhkg1-1.fna.fbcdn.net/v/t39.30808-6/example.jpg",
      },
    ]);
  });
});
