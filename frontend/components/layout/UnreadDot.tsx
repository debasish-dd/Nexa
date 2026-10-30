"use client";

import { useChatStore } from "@/store/chatStore";

// Place inside your Messages link. The link needs `relative` for the dot to
// sit on its corner.
export function UnreadDot() {
  const total = useChatStore((s) =>
    s.inbox.reduce((sum, item) => sum + item.unreadCount, 0)
  );

  if (total === 0) return null;

  return (
    <span
      aria-label="Unread messages"
      className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-[var(--danger)]"
    />
  );
}