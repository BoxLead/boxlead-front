import type { CommentResponse } from "../../api/types";

const MEDIA_LABELS: Record<string, string> = {
  FEED: "una publicación",
  REELS: "un reel",
  STORY: "una historia",
  AD: "un anuncio",
  IGTV: "un video",
};

export function mediaLabel(type: string | null): string {
  return (type && MEDIA_LABELS[type.toUpperCase()]) || "una publicación";
}

export type CommentNode = { comment: CommentResponse; replies: CommentResponse[] };

export function nestComments(comments: CommentResponse[]): CommentNode[] {
  const roots: CommentNode[] = [];
  const byId = new Map<string, CommentNode>();
  for (const comment of [...comments].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    const parent = comment.parentCommentId ? byId.get(comment.parentCommentId) : undefined;
    if (parent) {
      parent.replies.push(comment);
    } else {
      const node = { comment, replies: [] };
      byId.set(comment.id, node);
      roots.push(node);
    }
  }
  return roots;
}
