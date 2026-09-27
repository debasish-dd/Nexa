import { DMWindow } from "@/components/chats/DMWindow";

// TEMPORARY test harness — swap this for the actual other user's ID from
// your DB to test the pipe, then rip this whole thing out once you build
// a real conversation list.
const TEST_OTHER_USER_ID = "PASTE_A_TEST_USER_ID_HERE";

export default function FeedPage() {
  return (
    <main className="mx-auto h-screen max-w-lg bg-[#F3F1EA]">
      <DMWindow otherUserId={TEST_OTHER_USER_ID} />
    </main>
  );
}