import { describe, expect, it } from "vitest";
import { buildSinglePostInput, detectSource } from "@/lib/link-source";

describe("detectSource", () => {
  it("detects supported post hosts", () => {
    expect(detectSource("https://www.instagram.com/p/ABC/")).toBe("ig");
    expect(detectSource("https://instagram.com/reel/XYZ/")).toBe("ig");
    expect(detectSource("https://www.threads.net/@a/post/1")).toBe("threads");
    expect(detectSource("https://x.com/a/status/123")).toBe("x");
    expect(detectSource("https://twitter.com/a/status/123")).toBe("x");
    expect(detectSource("https://youtube.com/watch?v=1")).toBe("youtube");
    expect(detectSource("https://youtu.be/abc")).toBe("youtube");
    expect(detectSource("https://www.facebook.com/share/p/18gWXkcvsQ/")).toBe("facebook");
    expect(detectSource("https://m.facebook.com/story.php?story_fbid=1&id=2")).toBe("facebook");
    expect(detectSource("https://fb.watch/abc")).toBe("facebook");
    expect(detectSource("http://xhslink.com/o/30yWpkGWPN1")).toBe("xiaohongshu");
    expect(detectSource("https://www.xiaohongshu.com/discovery/item/abc")).toBe("xiaohongshu");
  });

  it("treats any other http(s) link as a generic web article", () => {
    expect(detectSource("https://example.com/post/1")).toBe("web");
    expect(detectSource("https://github.com/0xdurrrr/claude-hk-guide")).toBe("web");
    expect(detectSource("http://dub.sh/2X1BHq3")).toBe("web");
  });

  it("returns null for non-web or malformed urls", () => {
    expect(detectSource("not a url")).toBeNull();
    expect(detectSource("mailto:hi@example.com")).toBeNull();
    expect(detectSource("javascript:alert(1)")).toBeNull();
  });
});

describe("buildSinglePostInput", () => {
  it("uses directUrls with limit 1 for ig", () => {
    expect(
      buildSinglePostInput("ig", "https://www.instagram.com/p/ABC/"),
    ).toMatchObject({
      directUrls: ["https://www.instagram.com/p/ABC/"],
      resultsLimit: 1,
    });
  });

  it("caps x and threads at a single item", () => {
    expect(
      buildSinglePostInput("x", "https://x.com/a/status/1"),
    ).toMatchObject({ maxItems: 1 });
    expect(
      buildSinglePostInput("threads", "https://www.threads.net/@a/post/1"),
    ).toMatchObject({ maxItems: 1 });
  });

  it("enables direct Facebook post URL scraping", () => {
    expect(
      buildSinglePostInput("facebook", "https://www.facebook.com/share/p/18gWXkcvsQ/"),
    ).toMatchObject({
      post_urls: [{ url: "https://www.facebook.com/share/p/18gWXkcvsQ/" }],
    });
  });
});
