export function PagePlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section className="mx-auto w-full max-w-2xl">
      <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
      <div className="mt-6 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-14 text-center">
        <p className="font-semibold">Coming soon</p>
        <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>
      </div>
    </section>
  );
}