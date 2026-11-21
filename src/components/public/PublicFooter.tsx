"use client";

import Link from "next/link";
import { ContentImage } from "@/components/ui/ContentImage";
import { useAppData } from "@/context/AppDataContext";

export function PublicFooter() {
  const { site } = useAppData();

  return (
    <footer className="w-full bg-[#1C1B1F] text-white">
      <div className="max-w-[1920px] mx-auto px-6 lg:px-16 xl:px-32 py-14">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 pb-12 items-start">
          <div className="shrink-0">
            <ContentImage
              asset={site.logoLight}
              className="w-[200px] lg:w-[256px] h-auto object-contain"
            />
          </div>

          <address className="not-italic text-[16px] leading-[26px] text-white space-y-1">
            {site.footer.addressLines.map((line, index) => (
              <p key={`${index}-${line}`}>{line}</p>
            ))}
          </address>

          <nav
            aria-label="Legal links"
            className="flex flex-col items-start md:items-end gap-3"
          >
            {site.footer.legalLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-[16px] leading-[26px] text-white underline underline-offset-4 hover:text-[#A6C0FF] transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="border-t border-[#4D4D54] pt-8">
          <p className="text-[14px] text-white">{site.footer.copyright}</p>
        </div>
      </div>
    </footer>
  );
}
