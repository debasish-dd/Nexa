export function EmptyState({ message = "No posts available" }: { message?: string }) {
  return (
    <p className="py-24 text-center text-sm text-[var(--muted)]">{message}</p>
  );
}