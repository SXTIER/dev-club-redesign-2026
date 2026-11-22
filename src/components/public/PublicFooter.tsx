"use client";

import Link from "next/link";
import { ContentImage } from "@/components/ui/ContentImage";
import { useAppData } from "@/context/AppDataContext";

export function PublicFooter() {
  const { site } = useAppData();

  return (
    <footer className="w-full bg-[#1C1B1F] text-white">
      <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 xl:px-16 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-8 items-start">
          <div className="shrink-0">
            <Link
              href="/"
              aria-label="MUICT Dev Club home"
              className="inline-block focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              <ContentImage
                asset={site.logoLight}
                className="w-[160px] lg:w-[200px] h-auto object-contain"
              />
            </Link>
          </div>

          <address className="not-italic text-[14px] leading-[22px] text-white space-y-1">
            {site.footer.addressLines.map((line, index) => (
              <p key={`${index}-${line}`}>{line}</p>
            ))}
          </address>

          <nav
            aria-label="Legal links"
            className="flex flex-col items-start md:items-end gap-2.5"
          >
            {site.footer.legalLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-[14px] leading-[22px] text-white underline underline-offset-4 hover:text-[#A6C0FF] transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="border-t border-[#4D4D54] pt-6">
          <p className="text-[13px] text-white">{site.footer.copyright}</p>
        </div>
      </div>
    </footer>
  );
}
