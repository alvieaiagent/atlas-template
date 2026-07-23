"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerEnv } from "@/lib/env";
import { classifyPurpose } from "@/lib/integrations/classify";
import { generateForPurpose, type OutputKind } from "@/lib/integrations/generate";
import { transcribeVideo } from "@/lib/integrations/transcribe";
import { fetchYouTubeTranscript } from "@/lib/integrations/youtube-transcript";
import { detectSource } from "@/lib/link-source";
import {
  createLocalCategory,
  deleteLocalCategory,
  updateLocalCategory,
} from "@/lib/local-categories";
import { parseEngagement, parseMedia, splitCsv } from "@/lib/mappers";
import { parsePostPayload, postToInsert } from "@/lib/post-payload";
import {
  buildNoteInsert,
  resolveSinglePost,
  type NormalizedPostInsert,
} from "@/lib/scraping/apify";
import { snapshotInsertImage } from "@/lib/scraping/snapshot";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isPurpose } from "@/lib/types";
import type {
  GenerateState,
  LibraryPreview,
  MarkState,
  ResolveLinkState,
  ScriptsState,
} from "@/lib/types";

export async function markPostAction(
  _previous: MarkState,
  formData: FormData,
): Promise<MarkState> {
  const post = parsePostPayload(formData.get("postPayload"));
  // The 3-way Mark (Carousel / Reel / 一頁攻略圖) tags the post's 用途 as it marks.
  const markPurpose = formData.get("purpose");
  if (post && isPurpose(markPurpose)) {
    post.purpose = markPurpose;
  }
  const supabase = createSupabaseAdminClient();

  // Mock mode or unparseable payload: nothing to persist, stay green.
  if (!supabase || !post) {
    revalidatePath("/inspiration");
    revalidatePath("/marked");
    return {
      ran: true,
      supabase: "skipped",
      error: null,
    };
  }

  const { data: persistedPost, error: postError } = await supabase
    .from("posts")
    .upsert(postToInsert(post), { onConflict: "external_id" })
    .select("id")
    .single();

  if (postError) {
    return {
      ran: true,
      supabase: "failed",
      error: postError.message,
    };
  }

  const postId = persistedPost.id;

  const { error: markError } = await supabase
    .from("marked_posts")
    .upsert({ post_id: postId, status: "pending" });

  if (markError) {
    return {
      ran: true,
      supabase: "failed",
      error: markError.message,
    };
  }

  revalidatePath("/inspiration");
  revalidatePath("/marked");
  revalidatePath("/library");

  return {
    ran: true,
    supabase: "ok",
    error: null,
  };
}

// Lightweight 「收藏」 for the AI Radar — just toggles a marked_posts row (no
// 用途 sync), keeping the news-save flow separate from the
// heavier video-idea Mark. The post already lives in the DB (radar scrape row),
// so we toggle by its id.
export async function toggleRadarSave(formData: FormData): Promise<void> {
  const postId = String(formData.get("postId") ?? "");
  const isSaved = String(formData.get("saved") ?? "") === "1";
  const supabase = createSupabaseAdminClient();
  if (supabase && postId) {
    if (isSaved) {
      await supabase.from("marked_posts").delete().eq("post_id", postId);
    } else {
      await supabase.from("marked_posts").upsert({ post_id: postId });
    }
  }
  revalidatePath("/radar");
}

export async function unmarkPost(formData: FormData): Promise<void> {
  const postId = String(formData.get("postId") ?? "");
  const supabase = createSupabaseAdminClient();

  if (supabase && postId) {
    const { error } = await supabase
      .from("marked_posts")
      .delete()
      .eq("post_id", postId);

    if (error) {
      throw new Error(error.message);
    }
  }

  revalidatePath("/inspiration");
  revalidatePath("/marked");
}

// Toggle a Library post's "已經使用" flag — mark content you've already used.
export async function toggleUsedAction(formData: FormData): Promise<void> {
  const postId = String(formData.get("postId") ?? "");
  const used = String(formData.get("used") ?? "") === "1";
  const supabase = createSupabaseAdminClient();

  if (supabase && postId) {
    const { error } = await supabase
      .from("posts")
      .update({ used } as never)
      .eq("id", postId);
    if (error) {
      throw new Error(error.message);
    }
  }

  revalidatePath("/library");
}

export async function createCategory(formData: FormData): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const name = String(formData.get("name") ?? "").trim();
  const color = String(formData.get("color") ?? "#38bdf8").trim();

  if (!name) {
    redirect("/settings?error=category-name");
  }

  const input = {
    name,
    color,
    keywords: splitCsv(formData.get("keywords")),
    accounts: splitCsv(formData.get("accounts")),
    sortOrder: Number(formData.get("sortOrder") ?? 0),
  };

  if (!supabase) {
    await createLocalCategory(input);
    revalidatePath("/settings");
    revalidatePath("/inspiration");
    redirect("/settings?saved=local");
  }

  const { error } = await supabase.from("categories").insert({
    name: input.name,
    color: input.color,
    keywords: input.keywords,
    accounts: input.accounts,
    sort_order: input.sortOrder,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/settings");
  revalidatePath("/inspiration");
  redirect("/settings?saved=1");
}

export async function updateCategory(formData: FormData): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const id = String(formData.get("id") ?? "");

  const name = String(formData.get("name") ?? "").trim();
  const color = String(formData.get("color") ?? "#38bdf8").trim();
  const input = {
    name,
    color,
    keywords: splitCsv(formData.get("keywords")),
    accounts: splitCsv(formData.get("accounts")),
    sortOrder: Number(formData.get("sortOrder") ?? 0),
  };

  if (!id) {
    redirect("/settings?error=category-id");
  }

  if (!supabase) {
    await updateLocalCategory(id, input);
    revalidatePath("/settings");
    revalidatePath("/inspiration");
    redirect("/settings?saved=local");
  }

  const { error } = await supabase
    .from("categories")
    .update({
      name: input.name,
      color: input.color,
      keywords: input.keywords,
      accounts: input.accounts,
      sort_order: input.sortOrder,
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/settings");
  revalidatePath("/inspiration");
  redirect("/settings?saved=1");
}

export async function deleteCategory(formData: FormData): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const id = String(formData.get("id") ?? "");

  if (!id) {
    redirect("/settings?error=category-id");
  }

  if (!supabase) {
    await deleteLocalCategory(id);
  } else {
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) {
      throw new Error(error.message);
    }
  }

  revalidatePath("/settings");
  revalidatePath("/inspiration");
  redirect("/settings?saved=local");
}

function previewFromInsert(
  insert: NormalizedPostInsert,
  fallbackUrl: string,
): LibraryPreview {
  const media = parseMedia(insert.media ?? []);
  const engagement = parseEngagement(insert.engagement ?? {});

  return {
    source: insert.source,
    url: insert.url ?? fallbackUrl,
    authorName: insert.author_name,
    authorHandle: insert.author_handle,
    text: insert.text,
    thumbnailUrl: media[0]?.url ?? null,
    views: engagement.play,
  };
}

export async function resolveLinkAction(
  _previous: ResolveLinkState,
  formData: FormData,
): Promise<ResolveLinkState> {
  const url = String(formData.get("url") ?? "").trim();

  if (!url) {
    return {
      ran: true,
      ok: false,
      message: "Paste a link first.",
      persisted: false,
      preview: null,
    };
  }

  const source = detectSource(url);
  if (!source) {
    return {
      ran: true,
      ok: false,
      message: "唔係有效連結 — 貼一條 http(s) 網址(社交 post 或任何網站都得)。",
      persisted: false,
      preview: null,
    };
  }

  const env = getServerEnv();
  const urlOnlyPreview: LibraryPreview = {
    source,
    url,
    authorName: "",
    authorHandle: "",
    text: "",
    thumbnailUrl: null,
    views: 0,
  };

  if (
    !env.APIFY_TOKEN &&
    source !== "youtube" &&
    source !== "facebook" &&
    source !== "web" &&
    source !== "xiaohongshu"
  ) {
    return {
      ran: true,
      ok: true,
      persisted: false,
      message: "Apify disabled — showing the link only (not saved).",
      preview: urlOnlyPreview,
    };
  }

  let normalized: NormalizedPostInsert | null = null;
  try {
    normalized = await resolveSinglePost(source, url);
  } catch (error) {
    return {
      ran: true,
      ok: false,
      persisted: false,
      message: `Couldn't resolve the link: ${
        error instanceof Error ? error.message : "scrape failed"
      }`,
      preview: urlOnlyPreview,
    };
  }

  if (!normalized) {
    return {
      ran: true,
      ok: false,
      persisted: false,
      message: "No post data returned for that link.",
      preview: urlOnlyPreview,
    };
  }

  // YouTube / Facebook bookmarks keep resolver defaults; visual/text feeds get classified.
  if (
    env.GEMINI_API_KEY &&
    normalized.source !== "youtube" &&
    normalized.source !== "facebook"
  ) {
    normalized.purpose = await classifyPurpose(env.GEMINI_API_KEY, normalized.text);
  }

  const supabase = createSupabaseAdminClient();

  // Snapshot the thumbnail to permanent Storage now (IG/fbcdn URLs expire in ~days,
  // turning saved cards black). Mutates normalized.media[0].url → our own copy.
  if (supabase) {
    await snapshotInsertImage(supabase, normalized);
  }

  const preview = previewFromInsert(normalized, url);

  if (!supabase) {
    return {
      ran: true,
      ok: true,
      persisted: false,
      message: "Resolved — not saved (Supabase disabled).",
      preview,
    };
  }

  const { error } = await supabase
    .from("posts")
    .upsert(normalized, { onConflict: "external_id" });

  if (error) {
    return {
      ran: true,
      ok: false,
      persisted: false,
      message: `Resolved but couldn't save: ${error.message}`,
      preview,
    };
  }

  revalidatePath("/library");
  return {
    ran: true,
    ok: true,
    persisted: true,
    message: "Added to library.",
    preview,
  };
}

// Headless version of resolveLinkAction for the token-gated /capture route (iOS
// share shortcut). Same resolve → classify → save pipeline, simple result shape.
export async function captureLink(
  rawUrl: string,
): Promise<{ ok: boolean; message: string; title: string | null }> {
  const url = rawUrl.trim();
  if (!url) {
    return { ok: false, message: "No URL provided.", title: null };
  }

  const source = detectSource(url);
  if (!source) {
    return { ok: false, message: "唔係有效連結。", title: null };
  }

  const env = getServerEnv();
  if (
    !env.APIFY_TOKEN &&
    source !== "youtube" &&
    source !== "facebook" &&
    source !== "web" &&
    source !== "xiaohongshu"
  ) {
    return { ok: false, message: "Apify disabled.", title: null };
  }

  let normalized: NormalizedPostInsert | null = null;
  try {
    normalized = await resolveSinglePost(source, url);
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "scrape failed",
      title: null,
    };
  }
  if (!normalized) {
    return { ok: false, message: "No post data returned.", title: null };
  }

  // YouTube / Facebook bookmarks keep resolver defaults; visual/text feeds get classified.
  if (
    env.GEMINI_API_KEY &&
    normalized.source !== "youtube" &&
    normalized.source !== "facebook"
  ) {
    normalized.purpose = await classifyPurpose(env.GEMINI_API_KEY, normalized.text);
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return { ok: false, message: "Supabase disabled.", title: null };
  }

  // Snapshot thumbnail to permanent Storage before the IG/fbcdn URL expires.
  await snapshotInsertImage(supabase, normalized);

  const { error } = await supabase
    .from("posts")
    .upsert(normalized, { onConflict: "external_id" });
  if (error) {
    return { ok: false, message: error.message, title: null };
  }

  revalidatePath("/library");
  const preview = previewFromInsert(normalized, url);
  const title =
    preview.authorName || (preview.text ? preview.text.slice(0, 60) : null);
  return { ok: true, message: "Added to library.", title };
}

// Save a raw text blob as a Library "note" (no URL, no fetch). Same classify → save
// pipeline as resolveLinkAction, just sourced from the pasted text instead of a scrape.
export async function captureNoteAction(
  _previous: ResolveLinkState,
  formData: FormData,
): Promise<ResolveLinkState> {
  const text = String(formData.get("text") ?? "").trim();
  if (!text) {
    return {
      ran: true,
      ok: false,
      message: "貼一段文字先。",
      persisted: false,
      preview: null,
    };
  }

  const normalized = buildNoteInsert(text);

  const env = getServerEnv();
  if (env.GEMINI_API_KEY) {
    normalized.purpose = await classifyPurpose(env.GEMINI_API_KEY, normalized.text);
  }

  const preview = previewFromInsert(normalized, "");
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return {
      ran: true,
      ok: true,
      persisted: false,
      message: "已分析 — 未儲存(Supabase 未啟用)。",
      preview,
    };
  }

  const { error } = await supabase
    .from("posts")
    .upsert(normalized, { onConflict: "external_id" });
  if (error) {
    return {
      ran: true,
      ok: false,
      persisted: false,
      message: `儲存唔到:${error.message}`,
      preview,
    };
  }

  revalidatePath("/library");
  return {
    ran: true,
    ok: true,
    persisted: true,
    message: "已加入筆記。",
    preview,
  };
}

export async function grabScriptsAction(
  _previous: ScriptsState,
  formData: FormData,
): Promise<ScriptsState> {
  const post = parsePostPayload(formData.get("postPayload"));

  if (!post) {
    return {
      ran: true,
      ok: false,
      caption: null,
      transcript: null,
      error: "Couldn't read the post.",
    };
  }

  const caption = post.text;
  const supabase = createSupabaseAdminClient();

  // Cached? IG video URLs expire fast, so keep the first good transcript.
  if (supabase) {
    const { data: existing } = await supabase
      .from("post_scripts")
      .select("caption, transcript")
      .eq("post_id", post.id)
      .maybeSingle();
    if (existing?.transcript) {
      return {
        ran: true,
        ok: true,
        caption: existing.caption ?? caption,
        transcript: existing.transcript,
        error: null,
      };
    }
  }

  const video = post.media.find((item) => item.type === "video");
  if (!video) {
    if (supabase) {
      await supabase
        .from("post_scripts")
        .upsert({ post_id: post.id, caption, transcript: null });
    }
    return {
      ran: true,
      ok: true,
      caption,
      transcript: null,
      error: "呢個帖文唔係影片,冇逐字稿。",
    };
  }

  const env = getServerEnv();
  if (!env.GEMINI_API_KEY) {
    return {
      ran: true,
      ok: true,
      caption,
      transcript: null,
      error: "Gemini 未啟用 — 加 GEMINI_API_KEY 先轉到逐字稿。",
    };
  }

  const result = await transcribeVideo(env.GEMINI_API_KEY, video.url);
  if (!result.ok) {
    return {
      ran: true,
      ok: true,
      caption,
      transcript: null,
      error: result.error,
    };
  }

  if (supabase) {
    await supabase.from("post_scripts").upsert({
      post_id: post.id,
      caption,
      transcript: result.transcript,
      model: "gemini-2.5-flash",
    });
  }

  return {
    ran: true,
    ok: true,
    caption,
    transcript: result.transcript,
    error: null,
  };
}

export async function setPurposeAction(formData: FormData): Promise<void> {
  const postId = String(formData.get("postId") ?? "");
  const purpose = String(formData.get("purpose") ?? "");

  if (!postId || !isPurpose(purpose)) {
    return;
  }

  const supabase = createSupabaseAdminClient();
  if (supabase) {
    const { error } = await supabase
      .from("posts")
      .update({ purpose })
      .eq("id", postId);
    if (error) {
      throw new Error(error.message);
    }
  }

  revalidatePath("/library");
  revalidatePath("/inspiration");
}

export async function deletePostAction(formData: FormData): Promise<void> {
  const postId = String(formData.get("postId") ?? "");
  if (!postId) {
    return;
  }

  const supabase = createSupabaseAdminClient();
  if (supabase) {
    // marked_posts / post_scripts / post_outputs cascade via FK on delete.
    const { error } = await supabase.from("posts").delete().eq("id", postId);
    if (error) {
      throw new Error(error.message);
    }
  }

  revalidatePath("/library");
  revalidatePath("/inspiration");
  revalidatePath("/marked");
}

function normalizeWatchlistHandle(source: string, value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    const parts = url.pathname.split("/").filter(Boolean);
    if (source === "youtube") {
      return parts[0] === "@" ? parts[1] ?? trimmed : parts[0]?.replace(/^@/, "") ?? trimmed;
    }
    if (source === "ig") return parts[0] ?? trimmed;
    if (source === "threads") return (parts[0] ?? trimmed).replace(/^@/, "");
    if (source === "x") return parts[0] ?? trimmed;
  } catch {
    // Plain handle; normalize below.
  }

  return trimmed.replace(/^@/, "").replace(/\/$/, "");
}

export async function addCompetitorAction(formData: FormData): Promise<void> {
  const source = String(formData.get("source") ?? "");
  const handle = normalizeWatchlistHandle(source, String(formData.get("handle") ?? ""));
  const name = String(formData.get("name") ?? "").trim();

  if (
    (source !== "x" &&
      source !== "threads" &&
      source !== "ig" &&
      source !== "youtube" &&
      source !== "facebook") ||
    !handle
  ) {
    return;
  }

  const supabase = createSupabaseAdminClient();
  if (supabase) {
    const { error } = await supabase
      .from("competitors")
      .upsert({ source, handle, name: name || null });
    if (error) {
      throw new Error(error.message);
    }
  }

  revalidatePath("/competitors");
  revalidatePath("/library");
  revalidatePath("/inspiration");
  revalidatePath("/marked");
}

export async function removeCompetitorAction(formData: FormData): Promise<void> {
  const source = String(formData.get("source") ?? "");
  const handle = String(formData.get("handle") ?? "");

  if (
    (source !== "x" &&
      source !== "threads" &&
      source !== "ig" &&
      source !== "youtube" &&
      source !== "facebook") ||
    !handle
  ) {
    return;
  }

  const supabase = createSupabaseAdminClient();
  if (supabase) {
    const { error } = await supabase
      .from("competitors")
      .delete()
      .eq("source", source)
      .eq("handle", handle);
    if (error) {
      throw new Error(error.message);
    }
  }

  revalidatePath("/competitors");
  revalidatePath("/library");
  revalidatePath("/inspiration");
  revalidatePath("/marked");
}

export async function generateOutputAction(
  _previous: GenerateState,
  formData: FormData,
): Promise<GenerateState> {
  const post = parsePostPayload(formData.get("postPayload"));
  if (!post) {
    return {
      ran: true,
      ok: false,
      purpose: null,
      content: null,
      error: "Couldn't read the post.",
    };
  }

  const purpose = post.purpose;
  // Optional override: the Twitter→Thread column submits outputKind="thread" to
  // generate a Threads post regardless of the post's own classified purpose.
  const requested = formData.get("outputKind");
  const kind: OutputKind = requested === "thread" ? "thread" : post.purpose;
  const supabase = createSupabaseAdminClient();

  // Cached output for this (post, kind)?
  if (supabase) {
    const { data: cached } = await supabase
      .from("post_outputs")
      .select("content")
      .eq("post_id", post.id)
      .eq("kind", kind)
      .maybeSingle();
    if (cached?.content) {
      return { ran: true, ok: true, purpose, content: cached.content, error: null };
    }
  }

  const env = getServerEnv();
  if (!env.GEMINI_API_KEY) {
    return {
      ran: true,
      ok: false,
      purpose,
      content: null,
      error: "Gemini 未啟用 — 加 GEMINI_API_KEY 先生成。",
    };
  }

  // Material = cached caption/transcript (from 腳本) if present, else the post text.
  let caption = post.text;
  let transcript: string | null = null;
  if (supabase) {
    const { data: scripts } = await supabase
      .from("post_scripts")
      .select("caption, transcript")
      .eq("post_id", post.id)
      .maybeSingle();
    if (scripts) {
      caption = scripts.caption ?? caption;
      transcript = scripts.transcript;
    }
  }

  // No transcript yet? If it's a video, transcribe now so generation has the REAL content.
  // The caption alone is often just a CTA ("comment X for the link"), which yields a
  // generic result. This makes ✨生成 self-sufficient (no need to click 腳本 first).
  if (!transcript) {
    if (post.source === "youtube" && post.url) {
      // No downloadable file — let Gemini watch the YouTube URL directly.
      const yt = await fetchYouTubeTranscript(env.GEMINI_API_KEY, post.url);
      if (yt.ok) {
        transcript = yt.transcript;
        if (supabase) {
          await supabase.from("post_scripts").upsert({
            post_id: post.id,
            caption,
            transcript,
            model: "youtube-transcript",
          });
        }
      }
    } else {
      const video = post.media.find((item) => item.type === "video");
      if (video) {
        const transcribed = await transcribeVideo(env.GEMINI_API_KEY, video.url);
        if (transcribed.ok) {
          transcript = transcribed.transcript;
          if (supabase) {
            await supabase.from("post_scripts").upsert({
              post_id: post.id,
              caption,
              transcript,
              model: "gemini-2.5-flash",
            });
          }
        }
      }
    }
  }

  const result = await generateForPurpose(env.GEMINI_API_KEY, kind, {
    caption,
    transcript,
    authorName: post.authorName,
    source: post.source,
  });

  if (!result.ok) {
    return { ran: true, ok: false, purpose, content: null, error: result.error };
  }

  if (supabase) {
    await supabase.from("post_outputs").upsert({
      post_id: post.id,
      kind,
      content: result.content,
      model: "gemini-2.5-flash",
    });
  }

  return { ran: true, ok: true, purpose, content: result.content, error: null };
}
