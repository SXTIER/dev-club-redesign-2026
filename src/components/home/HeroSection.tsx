"use client";

import Link from "next/link";
import { ContentImage } from "@/components/ui/ContentImage";
import { useAppData } from "@/context/AppDataContext";

export function HeroSection() {
  const { home } = useAppData();
  const { hero } = home;

  return (
    <section className="relative w-full min-h-[calc(100dvh-4rem)] lg:min-h-0 flex flex-col justify-center overflow-hidden bg-[#0038E1] text-white">
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

      <div className="relative z-10 w-full max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 xl:px-16 py-10 sm:py-12 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] items-center gap-6 sm:gap-8 lg:gap-x-8 lg:gap-y-0">
          <p className="order-1 lg:col-start-1 lg:row-start-1 max-w-full text-[11px] sm:text-sm lg:text-[15px] font-medium leading-[20px] sm:leading-[22px] tracking-wide text-white/85 break-words">
            {hero.eyebrow}
          </p>

          <div className="order-2 lg:col-start-2 lg:row-start-1 lg:row-span-2 flex min-w-0 items-center justify-center lg:justify-end">
            <ContentImage
              asset={hero.heroArtwork}
              priority
              className="w-full max-w-[330px] sm:max-w-[380px] lg:max-w-[440px] xl:max-w-[500px] h-auto object-contain"
            />
          </div>

          <div className="order-3 lg:col-start-1 lg:row-start-2 lg:mt-12 min-w-0 flex flex-col items-start">
            <div className="flex min-w-0 max-w-full flex-col items-start">
              <div className="hidden lg:block ml-4 lg:w-[96px] lg:h-[96px]">
                <ContentImage
                  asset={hero.mascotImage}
                  priority
                  className="w-full h-full object-contain"
                />
              </div>

              <h1 className="lg:mt-4 text-[clamp(2rem,7.6vw,2.75rem)] sm:text-4xl md:text-5xl lg:text-[52px] xl:text-[62px] font-medium leading-[1.12] lg:leading-[1.15] tracking-tight lg:tracking-normal text-white break-words text-balance">
                {hero.headline}
              </h1>
            </div>

            <p className="mt-4 sm:mt-6 lg:mt-10 text-[15px] sm:text-lg lg:text-[20px] leading-relaxed lg:leading-[32px] text-white max-w-xl break-words">
              {hero.description}
            </p>

            <Link
              href={hero.ctaHref}
              className="mt-5 sm:mt-6 inline-flex min-h-[48px] w-full sm:w-auto px-5 py-3 items-center justify-center bg-[#A9E041] text-[#1C1B1F] text-sm sm:text-[15px] text-center font-medium hover:bg-[#97CE32] active:bg-[#86BC24] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              {hero.ctaLabel}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
