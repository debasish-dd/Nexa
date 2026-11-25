"use client";

import { useState } from "react";
import type { DiscoverableGroup } from "@/types/community";

export function CommunityCard({ group }: { group: DiscoverableGroup }) {
  // If the image URL is broken, fall back to the initial letter.
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = group.groupProfile && !imageFailed;

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
      </div>

      {/* Join button goes here in Step 4. */}
    </div>
  );
}