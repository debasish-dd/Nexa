import {
  Globe2,
  UsersRound,
  Zap,
  LockKeyhole,
} from "lucide-react";

const features = [
  {
    icon: Globe2,
    title: "Express Freely",
    description:
      "Share your thoughts, ideas, and everyday moments.",
  },
  {
    icon: UsersRound,
    title: "Find Communities",
    description:
      "Join or create communities around what you love.",
  },
  {
    icon: Zap,
    title: "Meet People",
    description:
      "Real conversations. Real connections.",
  },
  {
    icon: LockKeyhole,
    title: "A Kinder Internet",
    description:
      "A safer, more positive space for everyone.",
  },
];

export default function FeatureStrip() {
  return (
    <section className="border-b border-black/10 bg-[#f8f7f3]">
      <div className="mx-auto grid max-w-360 grid-cols-4 py-12 sm:max-w-7xl sm:px-6 lg:px-8">
        {features.map((feature, index) => {
          const Icon = feature.icon;

          return (
            <div
              key={feature.title}
              className={`
                flex gap-5 px-6
                ${index !== 0 ? "border-l border-black/10" : ""}
              `}
            >
              <div className="shrink-0 pt-1">
                <Icon
                  size={30}
                  strokeWidth={2.2}
                />
              </div>

              <div>
                <h3 className="text-[17px] font-semibold tracking-[-0.02em]">
                  {feature.title}
                </h3>

                <p className="mt-2 max-w-52.5 text-[14px] leading-[1.4] text-black/55">
                  {feature.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}