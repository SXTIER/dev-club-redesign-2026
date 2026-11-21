"use client";

import { useAppData } from "@/context/AppDataContext";

export function AboutSection() {
  const { home } = useAppData();
  const { about } = home;

  return (
    <section id="about" className="scroll-mt-28 w-full bg-[#F5F5FA]">
      <div className="max-w-[1920px] mx-auto px-6 lg:px-16 xl:px-32 py-16 lg:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-start lg:items-center">
          <div className="lg:col-span-6 min-w-0">
            <p className="text-[14px] sm:text-[16px] font-medium leading-[24px] text-[#0038E1]">
              {about.eyebrow}
            </p>
            <h2 className="mt-6 lg:mt-10 text-2xl sm:text-3xl lg:text-[38px] font-normal leading-snug lg:leading-[49px] text-[#1C1B1F]">
              {about.question}
            </h2>
            <p className="mt-4 lg:mt-6 text-xl sm:text-2xl lg:text-[32px] italic font-normal leading-tight lg:leading-[42px] text-[#0038E1]">
              {about.emphasis}
            </p>
          </div>

          <div className="lg:col-span-6 min-w-0">
            <p className="text-base sm:text-lg lg:text-[20px] leading-[30px] lg:leading-[34px] text-[#1C1B1F]">
              {about.body}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
