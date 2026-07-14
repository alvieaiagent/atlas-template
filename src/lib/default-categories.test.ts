import { describe, expect, it } from "vitest";
import { DEFAULT_CATEGORIES } from "@/lib/default-categories";

describe("default categories", () => {
  it("ships the 7 canonical + 3 radar categories", () => {
    expect(DEFAULT_CATEGORIES).toHaveLength(10);
    expect(DEFAULT_CATEGORIES.map((c) => c.name)).toEqual([
      "Prompt Engineering",
      "AI Video",
      "AI Code",
      "AI Image",
      "AI Tools",
      "Carousel Inspiration",
      "IG Story 漏斗",
      "🛰️ Radar・News",
      "🛰️ Radar・Labs",
      "🛰️ Radar・Discovery",
    ]);
  });

  it("uses unique fixed ids and sort orders for idempotent seeding", () => {
    const ids = new Set(DEFAULT_CATEGORIES.map((c) => c.id));
    const orders = new Set(DEFAULT_CATEGORIES.map((c) => c.sortOrder));
    expect(ids.size).toBe(DEFAULT_CATEGORIES.length);
    expect(orders.size).toBe(DEFAULT_CATEGORIES.length);
  });
});
