"use client";

import { ContentImage } from "@/components/ui/ContentImage";
import { useAppData } from "@/context/AppDataContext";

export function LocationSection() {
  const { home } = useAppData();
  const { location } = home;

  return (
    <section id="location" className="scroll-mt-28 w-full bg-[#F5F5FA]">
      <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-2">
        <div className="px-5 sm:px-8 lg:pl-12 xl:pl-16 lg:pr-10 py-10 lg:py-16 flex flex-col justify-center items-start">
          <p className="text-[13px] font-medium leading-[20px] text-[#0038E1]">
            {location.eyebrow}
          </p>

          <h2 className="mt-2.5 text-xl sm:text-2xl lg:text-[26px] font-normal leading-snug text-[#1C1B1F]">
            {location.heading}
          </h2>

          <p className="mt-4 lg:mt-6 text-2xl sm:text-3xl xl:text-[38px] font-normal leading-tight xl:leading-[48px] text-[#1C1B1F]">
            {location.campusName}
          </p>

          <a
            href={location.mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2.5 h-[46px] sm:h-[52px] px-5 bg-white border-2 border-[#D6D9E3] hover:border-[#0038E1] text-[15px] sm:text-[16px] font-medium text-[#1C1B1F] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0038E1]"
          >
            <span aria-hidden="true" className="w-4 h-4 shrink-0 inline-flex">
              <ContentImage
                asset={{ ...location.pinIcon, alt: "" }}
                width={16}
                height={16}
                className="w-4 h-4 object-contain"
              />
            </span>
            <span>{location.mapButtonLabel}</span>
          </a>

          <p className="mt-4 text-sm sm:text-[15px] leading-[24px] text-[#1C1B1F]">
            {location.note}
          </p>
        </div>

        <div className="relative h-[240px] sm:h-[320px] lg:h-auto lg:min-h-[400px] w-full overflow-hidden bg-[#E4E4E7]">
          <ContentImage
            asset={location.image}
            className="w-full h-full lg:absolute lg:inset-0 object-cover block"
          />
        </div>
      </div>
    </section>
  );
}
