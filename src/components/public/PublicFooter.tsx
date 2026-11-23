"use client";

import Link from "next/link";
import { ContentImage } from "@/components/ui/ContentImage";
import { useAppData } from "@/context/AppDataContext";

export function PublicFooter() {
  const { site } = useAppData();

  return (
    <footer className="w-full bg-[#1C1B1F] text-white">
      <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 xl:px-16 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] md:grid-cols-3 gap-5 sm:gap-8 pb-6 md:pb-8 items-start">
          <div className="min-w-0 sm:col-span-2 md:col-span-1">
            <Link
              href="/"
              aria-label="MUICT Dev Club home"
              className="inline-flex min-h-11 max-w-full items-center focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              <ContentImage
                asset={site.logoLight}
                className="w-[160px] max-w-full lg:w-[200px] h-auto object-contain"
              />
            </Link>
          </div>

          <address className="min-w-0 not-italic text-[14px] leading-[22px] text-white/85 space-y-1 break-words">
            {site.footer.addressLines.map((line, index) => (
              <p key={`${index}-${line}`}>{line}</p>
            ))}
          </address>

          <nav
            aria-label="Legal links"
            className="flex min-w-0 flex-wrap sm:flex-col items-start md:items-end gap-x-6 gap-y-0"
          >
            {site.footer.legalLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex min-h-11 max-w-full items-center text-[14px] leading-[22px] text-white underline underline-offset-4 hover:text-[#A6C0FF] transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white break-words"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="border-t border-[#4D4D54] pt-6">
          <p className="text-[12px] sm:text-[13px] leading-relaxed text-white/70 break-words">{site.footer.copyright}</p>
        </div>
      </div>
    </footer>
  );
}
