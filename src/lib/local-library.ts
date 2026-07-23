import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { v1LibraryPosts } from "@/lib/v1-library-seed";
import type { MarkedPost, Post, Purpose } from "@/lib/types";

const storePath = join(process.cwd(), ".hermes", "local-library-posts.json");

async function readStore(): Promise<Post[] | null> {
  try {
    return JSON.parse(await readFile(storePath, "utf8")) as Post[];
  } catch {
    return null;
  }
}

async function writeStore(posts: Post[]): Promise<void> {
  await mkdir(join(process.cwd(), ".hermes"), { recursive: true });
  await writeFile(storePath, `${JSON.stringify(posts, null, 2)}\n`);
}

export async function getLocalLibraryPosts(purpose?: Purpose): Promise<Post[]> {
  const posts = (await readStore()) ?? v1LibraryPosts;
  return purpose ? posts.filter((post) => post.purpose === purpose) : posts;
}

export async function getLocalMarkedPosts(): Promise<MarkedPost[]> {
  return (await getLocalLibraryPosts()).filter((post) => post.marked).map((post) => ({
    ...post,
    markedAt: post.fetchedAt,
    status: "pending",
    notes: null,
  }));
}

export async function upsertLocalLibraryPost(post: Post): Promise<void> {
  const posts = await getLocalLibraryPosts();
  const index = posts.findIndex((item) => item.id === post.id || item.externalId === post.externalId);
  if (index >= 0) {
    posts[index] = { ...posts[index], ...post };
  } else {
    posts.unshift(post);
  }
  await writeStore(posts);
}

export async function updateLocalLibraryPost(postId: string, patch: Partial<Post>): Promise<void> {
  const posts = await getLocalLibraryPosts();
  await writeStore(posts.map((post) => post.id === postId ? { ...post, ...patch } : post));
}

export async function deleteLocalLibraryPost(postId: string): Promise<void> {
  await writeStore((await getLocalLibraryPosts()).filter((post) => post.id !== postId));
}
