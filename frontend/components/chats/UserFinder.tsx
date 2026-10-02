"use client";

import { useState, type FormEvent } from "react";
import { DMWindow } from "./DMWindow";
import { findUser } from "@/libs/users/api";
import type { PublicUser } from "@/types/user";

export function UserFinder() {
  const [query, setQuery] = useState("");
  const [foundUser, setFoundUser] = useState<PublicUser | null>(null);
  const [chattingWith, setChattingWith] = useState<PublicUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setIsSearching(true);
    setError(null);
    setFoundUser(null);
    try {
      const user = await findUser(query.trim());
      setFoundUser(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "User not found");
    } finally {
      setIsSearching(false);
    }
  };

  if (chattingWith) {
    return (
      <div className="flex h-full flex-col">
        <button
          onClick={() => setChattingWith(null)}
          className="border-b-2 border-[#111111]/10 px-4 py-3 text-left text-sm font-medium text-[#111111]"
        >
          ← Back to search
        </button>
        <DMWindow otherUserId={chattingWith.id} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find by username or user ID"
          className="flex-1 rounded-full border-2 border-[#111111]/15 px-4 py-2 text-[15px] outline-none focus:border-[#111111]"
        />
        <button
          type="submit"
          disabled={isSearching}
          className="rounded-full bg-[#111111] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {isSearching ? "Searching…" : "Find"}
        </button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {foundUser && (
        <div className="flex items-center justify-between rounded-2xl border-2 border-[#111111]/10 bg-white px-4 py-3">
          <span className="font-medium text-[#111111]">{foundUser.username}</span>
          <button
            onClick={() => setChattingWith(foundUser)}
            className="rounded-full bg-[#111111] px-4 py-1.5 text-sm font-semibold text-white"
          >
            Chat
          </button>
        </div>
      )}
    </div>
  );
}