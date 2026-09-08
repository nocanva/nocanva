import assert from "node:assert/strict";
import test from "node:test";
import { latestFeedRenders } from "../lib/feed-preview.ts";

function render(overrides) {
  return { id: crypto.randomUUID(), postId: crypto.randomUUID(), draftRevisionId: null, parentRenderId: null, createdAt: 1, ...overrides };
}

test("keeps the newest render for repeated post and draft lineages", () => {
  const postId = crypto.randomUUID();
  const draftId = crypto.randomUUID();
  const oldPost = render({ id: "post-old", postId, createdAt: 10 });
  const newPost = render({ id: "post-new", postId, createdAt: 20 });
  const oldDraft = render({ id: "draft-old", draftRevisionId: `${draftId}@1`, createdAt: 30 });
  const newDraft = render({ id: "draft-new", draftRevisionId: `${draftId}@2`, createdAt: 40 });
  assert.deepEqual(latestFeedRenders([oldPost, newDraft, newPost, oldDraft]).map((item) => item.id), ["draft-new", "post-new"]);
});

test("collapses rerender ancestry even when legacy rerenders used new post IDs", () => {
  const root = render({ id: "root", postId: "post-root", createdAt: 10 });
  const child = render({ id: "child", postId: "post-child", parentRenderId: root.id, createdAt: 20 });
  const grandchild = render({ id: "grandchild", postId: "post-grandchild", parentRenderId: child.id, createdAt: 30 });
  const separate = render({ id: "separate", postId: "post-separate", createdAt: 25 });
  assert.deepEqual(latestFeedRenders([root, child, grandchild, separate]).map((item) => item.id), ["grandchild", "separate"]);
});

test("keeps newest-first order and applies the nine-cover limit", () => {
  const renders = Array.from({ length: 12 }, (_, index) => render({ id: `render-${index}`, postId: `post-${index}`, createdAt: index }));
  assert.deepEqual(latestFeedRenders(renders).map((item) => item.id), Array.from({ length: 9 }, (_, index) => `render-${11 - index}`));
});
