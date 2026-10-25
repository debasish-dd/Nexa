import { UserFinder } from "@/components/chats/UserFinder";

// The calc() heights account for the top bar, page padding and (on mobile)
// the bottom nav, so the chat fills the screen without the whole page scrolling.
export default function MessagesPage() {
  return (
    <div className="mx-auto h-[calc(100dvh-10.5rem)] max-w-2xl overflow-hidden rounded-2xl border border-(--border) bg-(--surface) md:h-[calc(100dvh-7rem)]">
      <UserFinder />
    </div>
  );
}