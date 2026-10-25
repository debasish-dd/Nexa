type AvatarProps = {
  name?: string | null;
  className?: string;
};

export function Avatar({
  name,
  className = "h-9 w-9",
}: AvatarProps) {
  const initials = name?.trim().slice(0, 1).toUpperCase() || "?";

  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-full bg-[var(--accent)] text-xs font-bold text-[var(--accent-fg)] ${className}`}
    >
      {initials}
    </span>
  );
}