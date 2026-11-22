"use client";

import { useAppData } from "@/context/AppDataContext";

export function AboutSection() {
  const { home } = useAppData();
  const { about } = home;

  return (
    <section id="about" className="scroll-mt-28 w-full bg-[#F5F5FA]">
      <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 xl:px-16 py-12 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-8 lg:gap-12 items-start lg:items-center">
          <div className="lg:col-span-6 min-w-0">
            <p className="text-[13px] sm:text-[14px] font-medium leading-[22px] text-[#0038E1]">
              {about.eyebrow}
            </p>
            <h2 className="mt-3 lg:mt-6 text-2xl sm:text-3xl lg:text-[32px] font-normal leading-snug lg:leading-[42px] text-[#1C1B1F] break-words">
              {about.question}
            </h2>
            <p className="mt-3 lg:mt-4 text-xl sm:text-2xl lg:text-[26px] italic font-normal leading-tight lg:leading-[34px] text-[#0038E1]">
              {about.emphasis}
            </p>
          </div>

          <div className="lg:col-span-6 min-w-0 border-t border-[#D6D9E3] pt-5 lg:border-0 lg:pt-0">
            <p className="text-[15px] sm:text-base lg:text-[17px] leading-[26px] lg:leading-[28px] text-[#1C1B1F] break-words">
              {about.body}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
