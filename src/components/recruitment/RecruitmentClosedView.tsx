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

        <div className="relative z-10 max-w-[1920px] mx-auto px-6 lg:px-16 xl:px-32 py-10 sm:py-14 lg:py-16">
          <p className="font-mono text-xs sm:text-sm lg:text-base font-medium tracking-wide text-white/95 uppercase">
            {banner.eyebrow}
          </p>
          <p className="mt-4 sm:mt-6 text-4xl sm:text-6xl lg:text-[76px] xl:text-[96px] font-medium leading-[1.12] text-white">
            {banner.headline}
          </p>
        </div>
      </section>

      {/* Recruitment Status — Closed */}
      <section className="w-full bg-[#F5F5FA] border-b border-[#E4E4E7]">
        <div className="max-w-[1920px] mx-auto px-6 lg:px-16 xl:px-32 py-12 sm:py-16 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            <div className="lg:col-span-4 space-y-4">
              <p className="font-mono text-sm font-medium tracking-wide text-[#0038E1]">
                {closedCopy.eyebrow}
              </p>
              <p className="text-[32px] sm:text-[36px] lg:text-[40px] font-medium leading-[1.25] text-[#1C1B1F]">
                {closedCopy.sideTitle}
              </p>
            </div>

            <div className="lg:col-span-8 bg-white border border-[#E2E8F0] rounded-[16px] p-6 sm:p-8 lg:p-10 max-w-3xl">
              <h1 className="text-[28px] sm:text-[40px] lg:text-[52px] font-medium leading-[1.2] text-[#1C1B1F]">
                {closedCopy.heading}
              </h1>
              <p className="mt-4 text-base sm:text-lg lg:text-[20px] leading-[1.7] text-[#4A5565]">
                {closedCopy.description}
              </p>

              <Link
                href={closedCopy.ctaHref}
                className="mt-8 inline-flex h-[54px] sm:h-[60px] px-6 sm:px-7 items-center justify-between gap-6 bg-[#A9E041] text-[#1C1B1F] text-base sm:text-[18px] font-medium border-2 border-[#001C26] hover:bg-[#97CE32] active:bg-[#86BC24] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0038E1]"
              >
                <span>{closedCopy.ctaLabel}</span>
                <ArrowRight className="w-5 h-5 shrink-0" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
