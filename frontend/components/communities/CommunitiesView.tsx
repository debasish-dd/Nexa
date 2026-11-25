"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { CreateGroupDialog } from "@/components/messages/CreateGroupDialog";
import { JoinedTab } from "@/components/communities/JoinedTab";
import {
  CommunitiesTabs,
  type CommunitiesTab,
} from "@/components/communities/CommunitiesTabs";
import { DiscoverTab } from "./DiscoverTab";

export function CommunitiesView() {
  const searchParams = useSearchParams();
  const activeTab: CommunitiesTab =
    searchParams.get("tab") === "discover" ? "discover" : "joined";

  const [creating, setCreating] = useState(false);

  return (
    <main className="mx-auto w-full max-w-2xl">
      <div className="flex items-center justify-between px-4 py-4">
        <h1 className="text-xl font-bold text-[var(--text)]">Communities</h1>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="rounded-full bg-[var(--accent)] px-4 py-1.5 text-sm font-semibold text-[var(--accent-fg)] hover:opacity-90"
        >
          New group
        </button>
      </div>

      <CommunitiesTabs active={activeTab} />

      {activeTab === "joined" && <JoinedTab />}

      {activeTab === "discover" && <DiscoverTab />}

      <CreateGroupDialog open={creating} onClose={() => setCreating(false)} />
    </main>
  );
}
