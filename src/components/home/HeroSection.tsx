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

      <div className="relative z-10 max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 xl:px-16 py-10 sm:py-14 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] items-center gap-8 lg:gap-8">
          <div className="min-w-0 flex flex-col items-start">
            <p className="text-xs sm:text-sm lg:text-[15px] font-medium leading-[22px] tracking-wide text-white">
              {hero.eyebrow}
            </p>

            <div className="mt-6 sm:mt-10 lg:mt-12 flex flex-col items-start">
              <div className="ml-1 sm:ml-4 w-[72px] h-[72px] sm:w-[88px] sm:h-[88px] lg:w-[96px] lg:h-[96px]">
                <ContentImage
                  asset={hero.mascotImage}
                  priority
                  className="w-full h-full object-contain"
                />
              </div>

              <h1 className="mt-3 sm:mt-4 text-[30px] sm:text-4xl md:text-5xl lg:text-[52px] xl:text-[62px] font-medium leading-[1.15] text-white break-words">
                {hero.headline}
              </h1>
            </div>

            <p className="mt-5 sm:mt-8 lg:mt-10 text-base sm:text-lg lg:text-[20px] leading-relaxed lg:leading-[32px] text-white max-w-xl">
              {hero.description}
            </p>

            <Link
              href={hero.ctaHref}
              className="mt-6 inline-flex h-[44px] sm:h-[48px] px-5 items-center justify-center bg-[#A9E041] text-[#1C1B1F] text-sm sm:text-[15px] font-medium hover:bg-[#97CE32] active:bg-[#86BC24] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              {hero.ctaLabel}
            </Link>
          </div>

          <div className="flex items-center justify-center lg:justify-end">
            <ContentImage
              asset={hero.heroArtwork}
              priority
              className="w-full max-w-[360px] lg:max-w-[440px] xl:max-w-[500px] h-auto object-contain"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
