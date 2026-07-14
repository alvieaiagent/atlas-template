import { describe, expect, it } from "vitest";
import { derivePostUrl, getPostUrl } from "@/lib/post-url";
import type { Post } from "@/lib/types";

function makePost(overrides: Partial<Post>): Post {
  return {
    id: "p1",
    source: "x",
    externalId: "x:1750000000000",
    authorHandle: "example_creator",
    authorName: "Example Creator",
    verified: false,
    text: "hello",
    media: [],
    engagement: { play: 0, like: 0, comment: 0, save: 0, share: 0 },
    postedAt: new Date(0).toISOString(),
    categoryIds: [],
    fetchedAt: new Date(0).toISOString(),
    url: null,
    purpose: "inbox",
    marked: false,
    used: false,
    ...overrides,
  };
}

describe("post url", () => {
  it("prefers an explicit https url", () => {
    expect(getPostUrl(makePost({ url: "https://x.com/a/status/1" }))).toBe(
      "https://x.com/a/status/1",
    );
  });

  it("derives an x url from the external id", () => {
    expect(getPostUrl(makePost({ url: null }))).toBe(
      "https://x.com/example_creator/status/1750000000000",
    );
  });

  it("derives ig, threads, and facebook urls", () => {
    expect(derivePostUrl("ig", "buildwithai", "ABC123")).toBe(
      "https://www.instagram.com/p/ABC123/",
    );
    expect(derivePostUrl("threads", "anthropicai", "XYZ")).toBe(
      "https://www.threads.net/@anthropicai/post/XYZ",
    );
    expect(derivePostUrl("facebook", "Meta", "123")).toBe(
      "https://www.facebook.com/Meta/posts/123",
    );
  });

  it("returns null for generated/seed ids", () => {
    expect(
      getPostUrl(makePost({ url: null, externalId: "x:generated:abc" })),
    ).toBeNull();
    expect(
      getPostUrl(makePost({ url: null, externalId: "seed:x:demo" })),
    ).toBeNull();
  });
});
