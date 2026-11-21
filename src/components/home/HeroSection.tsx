"use client";

import Link from "next/link";
import { ContentImage } from "@/components/ui/ContentImage";
import { useAppData } from "@/context/AppDataContext";

export function HeroSection() {
  const { home } = useAppData();
  const { hero } = home;

  return (
    <section className="relative w-full overflow-hidden bg-[#0038E1] text-white">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-black/10" />
        <div
          className="absolute inset-0 bg-repeat opacity-[0.28]"
          style={{
            backgroundImage: `url("${hero.patternImage.src}")`,
            backgroundSize: "1024px 1024px",
            backgroundPosition: "top left",
          }}
        />
      </div>

      <div className="relative z-10 max-w-[1920px] mx-auto px-6 lg:px-16 xl:px-32 py-14 sm:py-20 lg:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] items-center gap-10 lg:gap-8">
          <div className="min-w-0 flex flex-col items-start">
            <p className="text-sm sm:text-base lg:text-[20px] font-medium leading-[24px] tracking-wide text-white">
              {hero.eyebrow}
            </p>

            <div className="mt-10 sm:mt-16 lg:mt-24 flex flex-col items-start">
              <div className="ml-2 sm:ml-6 w-[88px] h-[88px] sm:w-[112px] sm:h-[112px] lg:w-[125px] lg:h-[125px]">
                <ContentImage
                  asset={hero.mascotImage}
                  priority
                  className="w-full h-full object-contain"
                />
              </div>

              <h1 className="mt-4 sm:mt-6 text-[34px] sm:text-5xl md:text-6xl lg:text-[64px] xl:text-[84px] font-medium leading-[1.15] text-white break-words">
                {hero.headline}
              </h1>
            </div>

            <p className="mt-8 sm:mt-12 lg:mt-16 text-lg sm:text-2xl lg:text-[26px] leading-relaxed lg:leading-[40px] text-white max-w-2xl">
              {hero.description}
            </p>

            <Link
              href={hero.ctaHref}
              className="mt-8 inline-flex h-[52px] sm:h-[58px] px-6 items-center justify-center bg-[#A9E041] text-[#1C1B1F] text-base sm:text-[18px] font-medium hover:bg-[#97CE32] active:bg-[#86BC24] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              {hero.ctaLabel}
            </Link>
          </div>

          <div className="flex items-center justify-center lg:justify-end">
            <ContentImage
              asset={hero.heroArtwork}
              priority
              className="w-full max-w-[460px] lg:max-w-[580px] xl:max-w-[688px] h-auto object-contain"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
