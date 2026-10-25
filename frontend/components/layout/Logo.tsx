export function Logo({
  className = "",
  wordmarkClassName = "",
}: {
  className?: string;
  wordmarkClassName?: string;
}) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--accent)] text-lg font-black text-[var(--accent-fg)]">
        N
      </span>
      <span
        className={`text-xl font-extrabold tracking-tight ${wordmarkClassName}`}
      >
        NEXA
      </span>
    </div>
  );
}