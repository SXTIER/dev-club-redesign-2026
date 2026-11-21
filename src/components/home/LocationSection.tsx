"use client";

import { ContentImage } from "@/components/ui/ContentImage";
import { useAppData } from "@/context/AppDataContext";

export function LocationSection() {
  const { home } = useAppData();
  const { location } = home;

  return (
    <section id="location" className="scroll-mt-28 w-full bg-[#F5F5FA]">
      <div className="max-w-[1920px] mx-auto grid grid-cols-1 lg:grid-cols-2">
        <div className="px-6 lg:pl-16 xl:pl-32 lg:pr-12 py-14 lg:py-20 flex flex-col justify-center items-start">
          <p className="text-[14px] font-medium leading-[22px] text-[#0038E1]">
            {location.eyebrow}
          </p>

          <h2 className="mt-3 text-2xl sm:text-3xl lg:text-[32px] font-normal leading-snug text-[#1C1B1F]">
            {location.heading}
          </h2>

          <p className="mt-6 lg:mt-8 text-3xl sm:text-4xl xl:text-[48px] font-normal leading-tight xl:leading-[60px] text-[#1C1B1F]">
            {location.campusName}
          </p>

          <a
            href={location.mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex items-center gap-3 h-[56px] sm:h-[64px] px-6 bg-white border-2 border-[#D6D9E3] hover:border-[#0038E1] text-[18px] sm:text-[20px] font-medium text-[#1C1B1F] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0038E1]"
          >
            <span aria-hidden="true" className="w-5 h-5 shrink-0 inline-flex">
              <ContentImage
                asset={{ ...location.pinIcon, alt: "" }}
                width={20}
                height={20}
                className="w-5 h-5 object-contain"
              />
            </span>
            <span>{location.mapButtonLabel}</span>
          </a>

          <p className="mt-6 text-base sm:text-[18px] leading-[28px] text-[#1C1B1F]">
            {location.note}
          </p>
        </div>

        <div className="relative h-[260px] sm:h-[360px] lg:h-auto lg:min-h-[540px] w-full overflow-hidden bg-[#E4E4E7]">
          <ContentImage
            asset={location.image}
            className="w-full h-full lg:absolute lg:inset-0 object-cover block"
          />
        </div>
      </div>
    </section>
  );
}
