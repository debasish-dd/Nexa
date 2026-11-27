"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { joinDiscoverableGroup } from "@/libs/groups/api";
import { useChatStore } from "@/store/chatStore";
import type { DiscoverableGroup } from "@/types/community";

export function CommunityCard({ group }: { group: DiscoverableGroup }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const loadGroupInbox = useChatStore((s) => s.loadGroupInbox);

  // If the image URL is broken, fall back to the initial letter.
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = group.groupProfile && !imageFailed;

  const join = useMutation({
    mutationFn: () => joinDiscoverableGroup(group.conversationId),
    onSuccess: () => {
      // Joined tab gets the new group, and Discover stops listing it.
      loadGroupInbox();
      queryClient.invalidateQueries({ queryKey: ["groups", "discoverable"] });
      router.push(`/communities/${group.conversationId}`);
    },
  });

  return (
    <div className="flex items-start gap-3 border-b border-[var(--border)] px-4 py-3">
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={group.groupProfile!}
          alt=""
          onError={() => setImageFailed(true)}
          className="h-12 w-12 shrink-0 rounded-full object-cover"
        />
      ) : (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-lg font-semibold text-[var(--accent-fg)]">
          {group.name.charAt(0).toUpperCase()}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-[var(--text)]">{group.name}</p>
        <p className="text-xs text-[var(--muted)]">
          {group.memberCount} {group.memberCount === 1 ? "member" : "members"}
        </p>
        {group.description && (
          <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">
            {group.description}
          </p>
        )}
        {join.isError && (
          <p role="alert" className="mt-1 text-xs text-[var(--danger)]">
            Could not join. Try again.
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => join.mutate()}
        disabled={join.isPending || join.isSuccess}
        className="shrink-0 rounded-full bg-[var(--accent)] px-4 py-1.5 text-sm font-semibold text-[var(--accent-fg)] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {join.isPending ? "Joining…" : join.isSuccess ? "Joined" : "Join"}
      </button>
    </div>
  );
}