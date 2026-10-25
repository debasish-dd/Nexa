import { RailCard } from "@/components/layout/RailCard";

export default function FeedPage() {
  return (
    <div className="mx-auto grid w-full max-w-2xl gap-6 xl:max-w-[1000px] xl:grid-cols-[minmax(0,1fr)_320px]">
      <section>
        <h1 className="text-2xl font-extrabold tracking-tight">Feed</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          See what people across your campus are sharing.
        </p>

        <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-6 py-16 text-center">
          <p className="font-semibold">No posts available</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Posts will show up here once people start sharing.
          </p>
        </div>
      </section>

      {/* Right rail only appears on wide screens */}
      <aside className="hidden flex-col gap-4 xl:flex">
        <RailCard title="What's happening" />
        <RailCard title="Suggested for you" />
        <RailCard title="Upcoming events" />
      </aside>
    </div>
  );
}