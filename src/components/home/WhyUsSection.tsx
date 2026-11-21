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
      <div className="max-w-[1920px] mx-auto px-6 lg:px-16 xl:px-32 py-16 lg:py-24">
        <div>
          <p className="text-[14px] font-medium leading-[22px] text-[#0038E1]">
            {whyUs.eyebrow}
          </p>
          <h2 className="mt-2 text-3xl sm:text-4xl lg:text-[48px] font-normal leading-tight lg:leading-[60px] text-[#1C1B1F]">
            {whyUs.heading}
          </h2>
        </div>

        <div className="mt-8 lg:mt-10 grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 xl:gap-10">
          {whyUs.cards.map((card, idx) => {
            const isLime = card.accent === "lime";
            const decorSrc =
              WHY_US_DECORATIONS[card.index] ??
              WHY_US_FALLBACK_ORDER[idx % WHY_US_FALLBACK_ORDER.length];

            return (
              <article
                key={`${card.index}-${card.title}`}
                className={[
                  "relative overflow-hidden rounded-[16px] p-7 sm:p-8 min-h-[300px] lg:min-h-[378px] flex flex-col justify-between text-[#1C1B1F]",
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
                  className="pointer-events-none select-none absolute -top-5 -right-5 w-[160px] h-[160px] sm:w-[196px] sm:h-[196px] opacity-85"
                />

                <span className="relative z-10 font-mono text-[16px] font-medium leading-[24px] text-[#1C1B1F]">
                  {card.index}
                </span>

                <div className="relative z-10 mt-14 sm:mt-16">
                  <h3 className="text-2xl sm:text-[26px] xl:text-[28px] font-normal leading-snug lg:leading-[38px] text-[#1C1B1F]">
                    {card.title}
                  </h3>
                  <p className="mt-4 text-base sm:text-[18px] leading-[28px] sm:leading-[29px] text-[#1C1B1F]">
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
