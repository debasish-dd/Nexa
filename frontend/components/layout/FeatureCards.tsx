"use client";

import { ArrowUpRight } from "lucide-react";
import { motion } from "motion/react";

const cards = [
  {
    number: "01",
    title: (
      <>
        Share
        <br />
        Your Mind
      </>
    ),
    description: "Quick thoughts, big ideas, and the moment in between.",
    image: "/hero/share-object.webp",
    className: "bg-[#efeee9]",
  },
  {
    number: "02",
    title: (
      <>
        Join
        <br />
        Communities
      </>
    ),
    description: "Find your people. Or create your own.",
    image: "/hero/community-object.webp",
    className: "bg-[#dfff00]",
  },
  {
    number: "03",
    title: (
      <>
        Build
        <br />
        Your Space
      </>
    ),
    description: "A profile that's truly yours.",
    image: "/hero/crown.webp",
    className: "bg-[#efeee9]",
  },
];

export default function FeatureCards() {
  return (
    <section className="bg-[#f8f7f3]">
      <div
        className="
          mx-auto
          grid
          max-w-360
          grid-cols-[280px_1fr]
          gap-10
          px-10
          py-7
          lg:py-8
        "
      >
        {/* =====================================
            LEFT TITLE
        ====================================== */}

        <div className="flex flex-col justify-center">
          <h2
            className="
              text-[46px]
              font-black
              leading-[0.88]
              tracking-[-0.055em]
            "
          >
            MORE
            <br />
            THAN JUST
            <br />
            A FEED
            <span className="ml-2 text-[#dfff00]">
              ✱
            </span>
          </h2>

          <div className="mt-7 text-[12px] font-medium uppercase tracking-wide text-black/55">
            <span>Thoughts</span>
            <span className="mx-2">→</span>

            <span>People</span>
            <span className="mx-2">→</span>

            <span>Communities</span>

            <br />

            <span className="ml-17.25">→</span>
            <span className="ml-2">A Brighter Internet</span>
          </div>
        </div>

        {/* =====================================
            CARDS
        ====================================== */}

        <div className="grid grid-cols-3 gap-3">
          {cards.map((card) => (
            <FeatureCard
              key={card.number}
              {...card}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

type FeatureCardProps = {
  number: string;
  title: React.ReactNode;
  description: string;
  image: string;
  className: string;
};

function FeatureCard({
  number,
  title,
  description,
  image,
  className,
}: FeatureCardProps) {
  return (
    <motion.article
      whileHover={{
        y: -4,
      }}
      transition={{
        duration: 0.25,
        ease: "easeOut",
      }}
      className={`
        group
        relative
        h-48.75
        overflow-hidden
        rounded-[14px]
        ${className}
      `}
    >
      {/* Number */}

      <span className="absolute left-6 top-5 z-20 text-[12px] font-medium">
        {number}
      </span>

      {/* Text */}

      <div className="relative z-20 p-6 pt-12">
        <h3 className="text-[25px] font-bold leading-[0.9] tracking-[-0.04em]">
          {title}
        </h3>

        <p className="mt-4 max-w-42.5 text-[12px] leading-[1.35] text-black/65">
          {description}
        </p>
      </div>

      {/* Arrow */}

      <div
        className="
          absolute
          bottom-4
          left-6
          z-20
          flex
          h-7
          w-7
          items-center
          justify-center
          rounded-full
          bg-black
          text-white
          transition-transform
          duration-300
          group-hover:rotate-45
        "
      >
        <ArrowUpRight size={14} />
      </div>

      {/* Image */}

      <img
        src={image}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="
          pointer-events-none
          absolute
          -right-2.5
          -bottom-5
          z-10
          w-[58%]
          max-w-none
          object-contain
          transition-transform
          duration-500
          ease-out
          group-hover:scale-[1.04]
        "
      />
    </motion.article>
  );
}