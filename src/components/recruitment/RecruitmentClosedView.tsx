"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { RecruitmentContent } from "@/lib/types/content";

export interface RecruitmentClosedViewProps {
  content: RecruitmentContent;
}

export default function RecruitmentClosedView({
  content,
}: RecruitmentClosedViewProps) {
  const { banner, closedCopy } = content;

  return (
    <div>
      {/* Bright Blue Hero Banner Strip */}
      <section className="relative w-full overflow-hidden bg-[#0038E1] text-white">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-black/10" />
          <div
            className="absolute inset-0 bg-repeat opacity-[0.28]"
            style={{
              backgroundImage: 'url("/images/figma/hero-pattern.png")',
              backgroundSize: "1024px 1024px",
              backgroundPosition: "top left",
            }}
          />
        </div>

        <div className="relative z-10 max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 xl:px-16 py-8 sm:py-10 lg:py-12">
          <p className="text-xs sm:text-sm font-medium tracking-wide text-white/95 uppercase">
            {banner.eyebrow}
          </p>
          <p className="mt-3 sm:mt-4 text-3xl sm:text-5xl lg:text-[54px] xl:text-[66px] font-medium leading-[1.12] text-white">
            {banner.headline}
          </p>
        </div>
      </section>

      {/* Recruitment Status — Closed */}
      <section className="w-full bg-[#F5F5FA]">
        <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 xl:px-16 py-12 sm:py-16 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            <div className="lg:col-span-4 space-y-3">
              <p className="text-xs sm:text-sm font-medium tracking-wide text-[#0038E1]">
                {closedCopy.eyebrow}
              </p>
              <p className="max-w-[240px] text-[26px] sm:text-[30px] lg:text-[34px] font-medium leading-[1.2] text-[#1C1B1F]">
                {closedCopy.sideTitle}
              </p>
            </div>

            <div className="lg:col-span-8 max-w-3xl">
              <h1 className="text-[26px] sm:text-[34px] lg:text-[40px] font-medium leading-[1.2] text-[#1C1B1F]">
                {closedCopy.heading}
              </h1>
              <p className="mt-3 text-sm sm:text-base lg:text-[17px] leading-[1.7] text-[#4A5565]">
                {closedCopy.description}
              </p>

              <Link
                href={closedCopy.ctaHref}
                className="mt-7 inline-flex h-[46px] sm:h-[50px] px-5 sm:px-6 items-center justify-between gap-6 bg-[#A9E041] text-[#1C1B1F] text-sm sm:text-[15px] font-medium hover:bg-[#97CE32] active:bg-[#86BC24] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0038E1]"
              >
                <span>{closedCopy.ctaLabel}</span>
                <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
