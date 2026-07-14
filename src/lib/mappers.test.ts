import { describe, expect, it } from "vitest";
import { parseEngagement, parseMedia, splitCsv } from "@/lib/mappers";

describe("mappers", () => {
  it("parses engagement JSON with safe numeric defaults", () => {
    expect(
      parseEngagement({
        play: 1000,
        like: "24",
        comment: null,
        save: 7,
        share: "bad",
      }),
    ).toEqual({
      play: 1000,
      like: 0,
      comment: 0,
      save: 7,
      share: 0,
    });
  });

  it("filters malformed media records", () => {
    expect(
      parseMedia([
        { type: "image", url: "https://example.com/image.jpg" },
        { type: "video", url: "https://example.com/video.mp4" },
        { type: "audio", url: "https://example.com/audio.mp3" },
        { type: "image" },
      ]),
    ).toEqual([
      { type: "image", url: "https://example.com/image.jpg" },
      { type: "video", url: "https://example.com/video.mp4" },
    ]);
  });

  it("splits comma-separated form values", () => {
    expect(splitCsv(" claude code, anthropic ,, cursor ")).toEqual([
      "claude code",
      "anthropic",
      "cursor",
    ]);
  });
});
