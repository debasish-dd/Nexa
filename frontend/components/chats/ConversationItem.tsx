import Link from "next/link";
import type { InboxItem } from "@/types/chat";

function formatTime(iso: string) {
  const date = new Date(iso);
  const isToday = date.toDateString() === new Date().toDateString();
  return isToday
    ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString([], { day: "numeric", month: "short" });
}

export function ConversationItem({
  item,
  currentUserId,
}: {
  item: InboxItem;
  currentUserId?: string;
}) {
  const { otherUser, lastMessage } = item;
    const unread = item.unreadCount > 0;
  const unreadLabel = item.unreadCount > 99 ? "99+" : String(item.unreadCount);
  const isOwn = lastMessage.senderId === currentUserId;

  const preview = lastMessage.isDeleted
    ? "Message deleted"
    : `${isOwn ? "You: " : ""}${lastMessage.content ?? ""}`;

  return (
    <Link
      href={`/messages/${otherUser.id}`}
      className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3 transition-colors hover:bg-[var(--surface-2)]"
    >
      {otherUser.avatarUrl ? (
        // Plain <img> avoids next/image domain config. Swap it later if you want.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={otherUser.avatarUrl}
          alt=""
          className="h-12 w-12 shrink-0 rounded-full object-cover"
        />
      ) : (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-lg font-semibold text-[var(--accent-fg)]">
          {otherUser.username.charAt(0).toUpperCase()}
        </div>
      )}

            <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p
            className={`truncate text-[var(--text)] ${
              unread ? "font-bold" : "font-semibold"
            }`}
          >
            {otherUser.username}
          </p>
          <span
            className={`shrink-0 text-xs ${
              unread ? "text-[var(--text)]" : "text-[var(--muted)]"
            }`}
          >
            {formatTime(lastMessage.createdAt)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p
            className={`truncate text-sm ${
              unread ? "font-medium text-[var(--text)]" : "text-[var(--muted)]"
            } ${lastMessage.isDeleted ? "italic" : ""}`}
          >
            {preview}
          </p>
          {unread && (
            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] px-1.5 text-xs font-semibold text-[var(--accent-fg)]">
              {unreadLabel}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}