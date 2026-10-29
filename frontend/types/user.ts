// ⚠️ Only id + username are confirmed (that's all the chat flow needs). If
// your search results carry more fields, add them here.
export type PublicUser = {
  id: string;
  username: string;
};

// What the user-search endpoint sends back: the matches in a `users` array.
// ⚠️ If the response also carries pagination info (a cursor, a total, ...),
// add those fields here once confirmed — only `users` is typed for now.
export type UserSearchResponse = {
  users: PublicUser[];
};
// Returned by GET /users/:id. Public fields only.
export type PublicUserProfile = PublicUser & {
  displayName: string | null;
  avatarUrl: string | null;
};