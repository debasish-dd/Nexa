// ⚠️ Guessed shape — haven't seen a "public user" endpoint yet, so this is
// just what's needed to show a search result and start a DM (id + username).
// Adjust once the real endpoint is confirmed.
export type PublicUser = {
  id: string;
  username: string;
};