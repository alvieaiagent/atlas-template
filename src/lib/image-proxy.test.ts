import { describe, expect, it } from "vitest";
import { isAllowedImageUrl, proxiedImage } from "@/lib/image-proxy";

describe("isAllowedImageUrl", () => {
  it("allows known image CDNs over https", () => {
    expect(
      isAllowedImageUrl("https://instagram.fwbw1-1.fna.fbcdn.net/v/t51.jpg"),
    ).toBe(true);
    expect(isAllowedImageUrl("https://scontent.cdninstagram.com/x.jpg")).toBe(true);
    expect(isAllowedImageUrl("https://video.fbsbx.com/v/t42.1790-2/x.mp4")).toBe(true);
    expect(isAllowedImageUrl("https://images.unsplash.com/photo.jpg")).toBe(true);
    expect(isAllowedImageUrl("https://picsum.photos/seed/a/1200/675")).toBe(true);
  });

  it("rejects other hosts, http, and bad urls", () => {
    expect(isAllowedImageUrl("https://example.com/x.jpg")).toBe(false);
    expect(isAllowedImageUrl("http://instagram.fwbw1-1.fna.fbcdn.net/x.jpg")).toBe(
      false,
    );
    expect(isAllowedImageUrl("http://localhost:3000/secret")).toBe(false);
    expect(isAllowedImageUrl("not a url")).toBe(false);
  });
});

describe("proxiedImage", () => {
  it("wraps allowed urls through /api/img", () => {
    expect(proxiedImage("https://picsum.photos/seed/a/10/10")).toBe(
      "/api/img?url=https%3A%2F%2Fpicsum.photos%2Fseed%2Fa%2F10%2F10",
    );
  });

  it("returns non-allowed urls unchanged", () => {
    expect(proxiedImage("https://example.com/x.jpg")).toBe(
      "https://example.com/x.jpg",
    );
  });
});
