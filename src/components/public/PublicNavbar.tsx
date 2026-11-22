"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { ContentImage } from "@/components/ui/ContentImage";
import { useAppData } from "@/context/AppDataContext";

export function PublicNavbar() {
  const { site } = useAppData();
  const [mobileOpen, setMobileOpen] = useState(false);
  const drawerId = useId();
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!mobileOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
      if (event.key === "Tab") {
        const links = menuRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled])',
        );
        const first = links?.[0];
        const last = links?.[links.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };

    const handleResize = () => {
      if (window.innerWidth >= 1280) setMobileOpen(false);
    };
    menuRef.current?.querySelector<HTMLElement>("button")?.focus();
    window.addEventListener("resize", handleResize);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
      triggerRef.current?.focus({ preventScroll: true });
    };
  }, [mobileOpen]);

  return (
    <header className="sticky top-0 z-40 w-full bg-[#FFFFFF] border-b border-[#E4E4E7]">
      <div className="max-w-[1440px] mx-auto h-16 xl:h-[72px] px-4 sm:px-8 lg:px-12 xl:px-16 flex items-center justify-between gap-4">
        <Link
          href="/"
          aria-label="MUICT Dev Club home"
          className="shrink-0 flex items-center select-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0038E1]"
        >
          <ContentImage
            asset={site.logoDark}
            className="h-8 xl:h-[42px] w-auto max-w-[calc(100vw-104px)] object-contain"
            priority
          />
        </Link>

        <nav
          aria-label="Main navigation"
          className="hidden xl:flex items-center gap-6 2xl:gap-9 text-[15px] leading-none text-[#1C1B1F]"
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
            className="hidden xl:flex min-h-11 px-5 items-center justify-center bg-[#0038E1] text-white text-[14px] font-medium border-2 border-[#001C26] hover:bg-[#002BAA] transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0038E1]"
          >
            {site.navbar.cta.label}
          </Link>

          <button
            ref={triggerRef}
            type="button"
            aria-label="Toggle navigation"
            aria-expanded={mobileOpen}
            aria-controls={drawerId}
            onClick={() => setMobileOpen((prev) => !prev)}
            className="xl:hidden inline-flex items-center justify-center w-11 h-11 rounded-lg border border-[#E4E4E7] text-[#1C1B1F] hover:bg-[#F4F5F7] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0038E1]"
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
          className="fixed inset-x-0 top-16 bottom-0 z-50 bg-[#1C1B1F]/45 backdrop-blur-sm xl:hidden flex items-start justify-end p-3 sm:p-5"
        >
          <div
            ref={menuRef}
            id={drawerId}
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
            className="w-full sm:max-w-sm max-h-[calc(100dvh-104px)] bg-white border border-[#E4E4E7] border-t-4 border-t-[#0038E1] rounded-xl shadow-xl flex flex-col p-4 sm:p-6 overflow-y-auto overscroll-contain pb-[max(1rem,env(safe-area-inset-bottom))]"
          >
            <div>
              <div className="flex items-center justify-between gap-3 border-b border-[#E4E4E7] pb-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#757E91]">
                  MUICT Dev Club
                </p>
                <button
                  type="button"
                  aria-label="Close navigation"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex items-center justify-center w-11 h-11 rounded-lg border border-[#E4E4E7] text-[#1C1B1F] hover:bg-[#F4F5F7] cursor-pointer focus-visible:outline-2 focus-visible:outline-[#0038E1]"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>

              <nav aria-label="Mobile links" className="mt-2 flex flex-col">
                {site.navbar.links.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="flex min-h-12 items-center justify-between gap-4 py-3 px-2 text-base font-medium text-[#1C1B1F] rounded-md hover:bg-[#F4F5F7] hover:text-[#0038E1] transition-colors focus-visible:outline-2 focus-visible:outline-[#0038E1]"
                  >
                    {item.label}
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-[#0038E1]" aria-hidden="true" />
                  </Link>
                ))}
              </nav>
            </div>

            <div className="mt-3 border-t border-[#E4E4E7] pt-4">
              <Link
                href={site.navbar.cta.href}
                onClick={() => setMobileOpen(false)}
                className="w-full min-h-[52px] px-4 py-3 flex items-center justify-center bg-[#0038E1] text-white text-base text-center font-medium border-2 border-[#001C26] rounded-md hover:bg-[#002BAA] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0038E1]"
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
