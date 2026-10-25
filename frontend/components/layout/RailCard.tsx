export function RailCard({ title }: { title: string }) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <h2 className="font-bold">{title}</h2>
      <p className="mt-3 text-sm text-[var(--muted)]">Coming soon.</p>
    </section>
  );
}