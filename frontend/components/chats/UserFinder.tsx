"use client";

import { useState, type SubmitEvent } from "react";
import { DMWindow } from "./DMWindow";
import { searchUsers } from "@/libs/users/api";
import type { PublicUser } from "@/types/user";
import { Avatar } from "@/components/layout/Avatar";

export function UserFinder() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PublicUser[]>([]);
  // true only after a search finished successfully, so "No users found"
  // doesn't flash up before the user has searched for anything
  const [hasSearched, setHasSearched] = useState(false);
  const [chattingWith, setChattingWith] = useState<PublicUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();

    const searchQuery = query.trim();

    if (!searchQuery || isSearching) return;

    setIsSearching(true);
    setError(null);
    setResults([]);
    setHasSearched(false);

    try {
      const users = await searchUsers(searchQuery);
      setResults(users);
      setHasSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="relative w-full min-w-0 text-[var(--text)]">
      {/* Search form */}
      <form onSubmit={handleSearch} className="flex w-full min-w-0 gap-2">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setResults([]);
            setHasSearched(false);
            setError(null);
          }}
          placeholder="Find someone by username"
          aria-label="Find someone by username"
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
      {!chattingWith && (error !== null || hasSearched) && (
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

                  <button
                    type="button"
                    onClick={() => setChattingWith(user)}
                    className="shrink-0 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-fg)] transition-opacity hover:opacity-90"
                  >
                    Chat
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Chat window overlay */}
      {chattingWith && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 flex h-[28rem] max-h-[calc(100dvh-7rem)] min-h-0 flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xl md:w-[28rem]">
          <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-3 py-3 sm:px-4">
            <span className="truncate text-sm font-semibold">
              {chattingWith.username}
            </span>

            <button
              type="button"
              onClick={() => setChattingWith(null)}
              className="shrink-0 rounded-full px-3 py-1.5 text-sm text-[var(--muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
            >
              ← Back
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden">
            <DMWindow otherUserId={chattingWith.id} />
          </div>
        </div>
      )}
    </div>
  );
}