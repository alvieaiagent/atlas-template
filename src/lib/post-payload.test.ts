import { describe, expect, it } from "vitest";
import { mockPosts } from "@/lib/mock-data";
import { parsePostPayload, postToInsert } from "@/lib/post-payload";

describe("post payload helpers", () => {
  it("parses a serialized card post payload", () => {
    const formValue = JSON.stringify(mockPosts[0]);

    expect(parsePostPayload(formValue)).toEqual(mockPosts[0]);
  });

  it("rejects malformed payloads", () => {
    expect(parsePostPayload("{bad json")).toBeNull();
    expect(parsePostPayload(JSON.stringify({ id: "only-id" }))).toBeNull();
  });

  it("maps a post to a posts insert without forcing the primary key", () => {
    const insert = postToInsert(mockPosts[0]);

    expect(insert).toMatchObject({
      source: mockPosts[0].source,
      external_id: mockPosts[0].externalId,
      author_handle: mockPosts[0].authorHandle,
      category_ids: mockPosts[0].categoryIds,
    });
    expect("id" in insert).toBe(false);
  });
});
