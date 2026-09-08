type FeedRender = {
  id: string;
  postId: string;
  draftRevisionId: string | null;
  parentRenderId: string | null;
  createdAt: number;
};

function draftId(revisionId: string) {
  const separator = revisionId.lastIndexOf("@");
  return separator > 0 ? revisionId.slice(0, separator) : revisionId;
}

function lineageKey<T extends FeedRender>(render: T, byId: Map<string, T>) {
  if (render.draftRevisionId) return `draft:${draftId(render.draftRevisionId)}`;
  let current = render;
  const visited = new Set<string>();
  while (current.parentRenderId && !visited.has(current.id)) {
    visited.add(current.id);
    const parent = byId.get(current.parentRenderId);
    if (!parent) return `render:${current.parentRenderId}`;
    if (parent.draftRevisionId) return `draft:${draftId(parent.draftRevisionId)}`;
    current = parent;
  }
  return `post:${current.postId}`;
}

export function latestFeedRenders<T extends FeedRender>(renders: T[], limit = 9) {
  const ordered = [...renders].sort((first, second) => second.createdAt - first.createdAt || second.id.localeCompare(first.id));
  const byId = new Map(ordered.map((render) => [render.id, render]));
  const latestByLineage = new Map<string, T>();
  for (const render of ordered) {
    const key = lineageKey(render, byId);
    if (!latestByLineage.has(key)) latestByLineage.set(key, render);
  }
  return Array.from(latestByLineage.values()).slice(0, Math.max(0, limit));
}
