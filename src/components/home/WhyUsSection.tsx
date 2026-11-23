"use client";

import { useAppData } from "@/context/AppDataContext";

const WHY_US_DECORATIONS: Record<string, string> = {
  "01": "/images/figma/why-ag.svg",
  "02": "/images/figma/why-ec.svg",
  "03": "/images/figma/why-ee.svg",
};

const WHY_US_FALLBACK_ORDER = [
  "/images/figma/why-ag.svg",
  "/images/figma/why-ec.svg",
  "/images/figma/why-ee.svg",
];

export function WhyUsSection() {
  const { home } = useAppData();
  const { whyUs } = home;

  return (
    <section id="why-us" className="scroll-mt-28 w-full bg-[#FFFFFF]">
      <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 xl:px-16 py-12 lg:py-16">
        <div>
          <p className="text-[13px] font-medium leading-[20px] text-[#0038E1]">
            {whyUs.eyebrow}
          </p>
          <h2 className="mt-2 text-2xl sm:text-3xl lg:text-[38px] font-normal leading-tight lg:leading-[48px] text-[#1C1B1F]">
            {whyUs.heading}
          </h2>
        </div>

        <div className="mt-6 lg:mt-8 grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-6 xl:gap-8">
          {whyUs.cards.map((card, idx) => {
            const isLime = card.accent === "lime";
            const decorSrc =
              WHY_US_DECORATIONS[card.index] ??
              WHY_US_FALLBACK_ORDER[idx % WHY_US_FALLBACK_ORDER.length];

            return (
              <article
                key={`${card.index}-${card.title}`}
                className={[
                  "relative min-w-0 overflow-hidden rounded-[14px] p-5 sm:p-6 min-h-[200px] sm:min-h-[240px] lg:min-h-[290px] flex flex-col justify-between text-[#1C1B1F]",
                  isLime ? "bg-[#A9E041]" : "bg-[#F5F5FA]",
                ].join(" ")}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={decorSrc}
                  alt=""
                  aria-hidden="true"
                  width={233}
                  height={233}
                  loading="lazy"
                  decoding="async"
                  className="pointer-events-none select-none absolute -top-3 -right-3 w-[104px] h-[104px] sm:-top-4 sm:-right-4 sm:w-[152px] sm:h-[152px] opacity-85"
                />

                <span className="relative z-10 text-[14px] font-medium leading-[20px] text-[#1C1B1F]">
                  {card.index}
                </span>

                <div className="relative z-10 mt-7 sm:mt-12">
                  <h3 className="text-xl sm:text-[22px] font-normal leading-snug lg:leading-[30px] text-[#1C1B1F] break-words">
                    {card.title}
                  </h3>
                  <p className="mt-2 sm:mt-3 text-sm sm:text-[15px] leading-[24px] text-[#1C1B1F] break-words">
                    {card.description}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
