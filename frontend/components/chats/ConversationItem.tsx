import Link from "next/link";
import type { DMInboxItem, GroupInboxItem, InboxItem } from "@/types/chat";

function formatTime(iso: string) {
  const date = new Date(iso);
  const isToday = date.toDateString() === new Date().toDateString();
  return isToday
    ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString([], { day: "numeric", month: "short" });
}

function Avatar({ url, name }: { url: string | null; name: string }) {
  return url ? (
    // Plain <img> avoids next/image domain config. Swap it later if you want.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      className="h-12 w-12 shrink-0 rounded-full object-cover"
    />
  ) : (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-lg font-semibold text-[var(--accent-fg)]">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] px-1.5 text-xs font-semibold text-[var(--accent-fg)]">
      {count > 99 ? "99+" : count}
    </span>
  );
}

// One inbox row. DMs and groups differ only in what they pass in.
function Row({
  href,
  avatarUrl,
  name,
  time,
  preview,
  italic,
  unreadCount,
}: {
  href: string;
  avatarUrl: string | null;
  name: string;
  time: string;
  preview: string;
  italic: boolean;
  unreadCount: number;
}) {
  const unread = unreadCount > 0;

  return (
    <Link
      href={href}
      className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3 transition-colors hover:bg-[var(--surface-2)]"
    >
      <Avatar url={avatarUrl} name={name} />

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p
            className={`truncate text-[var(--text)] ${
              unread ? "font-bold" : "font-semibold"
            }`}
          >
            {name}
          </p>
          <span
            className={`shrink-0 text-xs ${
              unread ? "text-[var(--text)]" : "text-[var(--muted)]"
            }`}
          >
            {time}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p
            className={`truncate text-sm ${
              unread ? "font-medium text-[var(--text)]" : "text-[var(--muted)]"
            } ${italic ? "italic" : ""}`}
          >
            {preview}
          </p>
          <UnreadBadge count={unreadCount} />
        </div>
      </div>
    </Link>
  );
}

function DMRow({
  item,
  currentUserId,
}: {
  item: DMInboxItem;
  currentUserId?: string | undefined;
}) {
  const { otherUser, lastMessage } = item;
  const isOwn = lastMessage.senderId === currentUserId;

  const preview = lastMessage.isDeleted
    ? "Message deleted"
    : `${isOwn ? "You: " : ""}${lastMessage.content ?? ""}`;

  return (
    <Row
      href={`/messages/${otherUser.id}`}
      avatarUrl={otherUser.avatarUrl}
      name={otherUser.username}
      time={formatTime(item.lastActivityAt)}
      preview={preview}
      italic={lastMessage.isDeleted}
      unreadCount={item.unreadCount}
    />
  );
}

function GroupRow({
  item,
  currentUserId,
}: {
  item: GroupInboxItem;
  currentUserId?: string;
}) {
  const { group, lastMessage } = item;

  let preview: string;
  let italic = false;

  if (!lastMessage) {
    preview = "No messages yet";
    italic = true;
  } else if (lastMessage.isDeleted) {
    preview = "Message deleted";
    italic = true;
  } else {
    const who =
      lastMessage.senderId === currentUserId
        ? "You"
        : (lastMessage.senderName ?? "Someone");

    preview = `${who}: ${lastMessage.content ?? ""}`;
  }

  return (
    <Row
      href={`/communities/${item.conversationId}`}
      avatarUrl={group.avatarUrl}
      name={group.name}
      time={formatTime(item.lastActivityAt)}
      preview={preview}
      italic={italic}
      unreadCount={item.unreadCount}
    />
  );
}

export function ConversationItem({
  item,
  currentUserId,
}: {
  item: InboxItem;
  currentUserId?: string | undefined;
}) {
  if (item.type === "gc") {
    return <GroupRow item={item} currentUserId={currentUserId} />;
  }

  return <DMRow item={item} currentUserId={currentUserId} />;
}