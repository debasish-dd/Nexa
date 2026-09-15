// components/landing/Hero.tsx

import HeroParallax from "./HeroParallax";

export default function Hero() {
  return (
    <section className="relative min-h-screen overflow-hidden bg-[#f8f7f3]">
      <div className="mx-auto grid max-w-[1440px] grid-cols-2 items-center px-10 pt-20">
        {/* LEFT */}
        <div className="relative z-[100]">
          <p className="mb-4 text-sm font-medium uppercase tracking-wide">
            A kinder, cooler internet
          </p>

          <h1 className="max-w-[650px] text-[clamp(4rem,7vw,7rem)] font-black leading-[0.82] tracking-[-0.06em]">
            SHARE
            <br />
            CONNECT
            <br />
            BELONG.
          </h1>

          <p className="mt-8 max-w-[500px] text-lg leading-relaxed text-neutral-600">
            Nova is a social space for real people — share your thoughts, join
            communities, and find your people.
          </p>

          <div className="mt-8 flex gap-4">
            <button className="rounded-full bg-black px-7 py-4 text-white">
              Get Started →
            </button>

            <button className="rounded-full border border-black px-7 py-4">
              Watch Video →
            </button>
          </div>
        </div>

        {/* RIGHT */}
        <div className="relative min-w-0">
          <HeroParallax />
        </div>
      </div>
    </section>
  );
}
