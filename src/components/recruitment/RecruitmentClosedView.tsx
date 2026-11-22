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
      <section className="w-full bg-[#F5F5FA] border-b border-[#E4E4E7]">
        <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 xl:px-16 py-10 sm:py-12 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-start">
            <div className="lg:col-span-4 space-y-3">
              <p className="text-xs sm:text-sm font-medium tracking-wide text-[#0038E1]">
                {closedCopy.eyebrow}
              </p>
              <p className="text-[26px] sm:text-[30px] lg:text-[32px] font-medium leading-[1.25] text-[#1C1B1F]">
                {closedCopy.sideTitle}
              </p>
            </div>

            <div className="lg:col-span-8 bg-white border border-[#E2E8F0] rounded-[16px] p-6 sm:p-8 max-w-3xl">
              <h1 className="text-[24px] sm:text-[32px] lg:text-[38px] font-medium leading-[1.2] text-[#1C1B1F]">
                {closedCopy.heading}
              </h1>
              <p className="mt-3 text-sm sm:text-base lg:text-[17px] leading-[1.7] text-[#4A5565]">
                {closedCopy.description}
              </p>

              <Link
                href={closedCopy.ctaHref}
                className="mt-6 inline-flex h-[46px] sm:h-[50px] px-5 sm:px-6 items-center justify-between gap-5 bg-[#A9E041] text-[#1C1B1F] text-sm sm:text-[15px] font-medium border-2 border-[#001C26] hover:bg-[#97CE32] active:bg-[#86BC24] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0038E1]"
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
