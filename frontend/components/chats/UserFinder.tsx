"use client";

import { useState, type SubmitEvent } from "react";
import Link from "next/link";
import { ApiRequestError } from "@/libs/http/client";
import { getUserById, searchUsers } from "@/libs/users/api";
import { useAuthStore } from "@/store/authStore";
import type { PublicUser } from "@/types/user";
import { Avatar } from "@/components/layout/Avatar";

// A pasted user ID looks like e725574a-1e7b-45a1-b8df-1b75b14357f2
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function UserFinder() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PublicUser[]>([]);
  // true only after a search finished successfully, so "No users found"
  // doesn't flash up before the user has searched for anything
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const currentUserId = useAuthStore((s) => s.user?.id);

  const resetResults = () => {
    setResults([]);
    setHasSearched(false);
    setError(null);
  };

  const handleSearch = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();

    const searchQuery = query.trim();

    if (!searchQuery || isSearching) return;

    setIsSearching(true);
    resetResults();

    try {
      if (UUID_PATTERN.test(searchQuery)) {
        // Looks like a user ID: look that exact user up.
        const user = await getUserById(searchQuery);
        setResults([user]);
      } else {
        setResults(await searchUsers(searchQuery));
      }
      setHasSearched(true);
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 404) {
        // A valid-looking ID that nobody has: same as an empty search.
        setHasSearched(true);
      } else {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    } finally {
      setIsSearching(false);
    }
  };

  // The dropdown stays mounted while the route changes, so clear it on click.
  const handleOpenChat = () => {
    setQuery("");
    resetResults();
  };

  return (
    <div className="relative w-full min-w-0 text-[var(--text)]">
      {/* Search form */}
      <form onSubmit={handleSearch} className="flex w-full min-w-0 gap-2">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            resetResults();
          }}
          placeholder="Find someone by username or ID"
          aria-label="Find someone by username or ID"
          className="h-10 min-w-0 flex-1 rounded-full border border-(--border) bg-(--surface) px-3 text-sm text-(--text) outline-none placeholder:text-(--muted) focus:border-(--accent-text) focus:ring-1 focus:ring-(--accent-text) sm:px-4"
        />

        <button
          type="submit"
          disabled={isSearching || !query.trim()}
          className="h-10 shrink-0 rounded-full bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--accent-fg)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSearching ? "Searching…" : "Find"}
        </button>
      </form>

      {/* Search results dropdown */}
      {(error !== null || hasSearched) && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-80 overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2 shadow-xl sm:p-3">
          {error !== null && (
            <p className="px-3 py-2 text-sm text-[var(--danger)]">{error}</p>
          )}

          {hasSearched && results.length === 0 && (
            <p className="px-3 py-2 text-sm text-[var(--muted)]">
              No users found
            </p>
          )}

          {results.length > 0 && (
            <ul className="flex flex-col">
              {results.map((user) => (
                <li
                  key={user.id}
                  className="flex items-center justify-between gap-2 rounded-xl p-2 transition-colors hover:bg-[var(--surface-2)] sm:gap-3"
                >
                  <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                    <Avatar name={user.username} />

                    <span className="truncate text-sm font-medium">
                      {user.username}
                    </span>
                  </div>

                  {user.id === currentUserId ? (
                    <span className="shrink-0 px-4 py-2 text-sm text-[var(--muted)]">
                      You
                    </span>
                  ) : (
                    <Link
                      href={`/messages/${user.id}`}
                      onClick={handleOpenChat}
                      className="shrink-0 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-fg)] transition-opacity hover:opacity-90"
                    >
                      Chat
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}