"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { ContentImage } from "@/components/ui/ContentImage";
import { useAppData } from "@/context/AppDataContext";

export function PublicNavbar() {
  const { site } = useAppData();
  const [mobileOpen, setMobileOpen] = useState(false);
  const drawerId = useId();

  useEffect(() => {
    if (!mobileOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileOpen]);

  return (
    <header className="sticky top-0 z-40 w-full bg-[#FFFFFF] border-b border-[#E4E4E7]">
      <div className="max-w-[1440px] mx-auto h-16 lg:h-[72px] px-5 sm:px-8 lg:px-12 xl:px-16 flex items-center justify-between gap-6">
        <Link
          href="/"
          aria-label="MUICT Dev Club home"
          className="shrink-0 flex items-center select-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0038E1]"
        >
          <ContentImage
            asset={site.logoDark}
            className="h-[36px] lg:h-[42px] w-auto object-contain"
            priority
          />
        </Link>

        <nav
          aria-label="Main navigation"
          className="hidden lg:flex items-center gap-6 xl:gap-9 text-[15px] leading-none text-[#1C1B1F]"
        >
          {site.navbar.links.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap hover:text-[#0038E1] transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0038E1]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            href={site.navbar.cta.href}
            className="hidden lg:flex h-[42px] px-5 items-center justify-center bg-[#0038E1] text-white text-[14px] font-medium border-2 border-[#001C26] hover:bg-[#002BAA] transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0038E1]"
          >
            {site.navbar.cta.label}
          </Link>

          <button
            type="button"
            aria-label="Toggle navigation"
            aria-expanded={mobileOpen}
            aria-controls={drawerId}
            onClick={() => setMobileOpen((prev) => !prev)}
            className="lg:hidden inline-flex items-center justify-center w-11 h-11 border border-[#E4E4E7] text-[#1C1B1F] hover:bg-[#F4F5F7] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0038E1]"
          >
            {mobileOpen ? (
              <X className="w-6 h-6" aria-hidden="true" />
            ) : (
              <Menu className="w-6 h-6" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div
          data-testid="mobile-nav-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setMobileOpen(false);
            }
          }}
          className="fixed inset-0 z-50 bg-[#1C1B1F]/60 lg:hidden flex justify-end"
        >
          <div
            id={drawerId}
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
            className="w-full max-w-sm h-full bg-[#FFFFFF] border-l-2 border-[#001C26] flex flex-col justify-between p-6 overflow-y-auto"
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-[#E4E4E7] pb-4">
                <Link
                  href="/"
                  aria-label="MUICT Dev Club home"
                  onClick={() => setMobileOpen(false)}
                  className="shrink-0 flex items-center select-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0038E1]"
                >
                  <ContentImage
                    asset={site.logoDark}
                    className="h-[36px] w-auto object-contain"
                  />
                </Link>
                <button
                  type="button"
                  aria-label="Close navigation"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex items-center justify-center w-10 h-10 border border-[#E4E4E7] text-[#1C1B1F] hover:bg-[#F4F5F7] cursor-pointer"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>

              <nav aria-label="Mobile links" className="flex flex-col gap-1">
                {site.navbar.links.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="py-3 px-2 text-[18px] font-medium text-[#1C1B1F] border-b border-[#E4E4E7] hover:text-[#0038E1] transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>

            <div className="pt-6">
              <Link
                href={site.navbar.cta.href}
                onClick={() => setMobileOpen(false)}
                className="w-full h-[52px] px-6 flex items-center justify-center bg-[#0038E1] text-white text-[16px] font-medium border-2 border-[#001C26] hover:bg-[#002BAA] transition-colors"
              >
                {site.navbar.cta.label}
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
