"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircleQuestion,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { ContentImage } from "@/components/ui/ContentImage";
import { useAppData } from "@/context/AppDataContext";

export type AdminNavKey =
  | "overview"
  | "site-content"
  | "events"
  | "recruitment"
  | "inquiries";

export interface AdminShellProps {
  activeNav: AdminNavKey;
  title?: string;
  subtitle?: string;
  headerAction?: ReactNode;
  children: ReactNode;
}

interface AdminNavItem {
  key: AdminNavKey;
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
}

const ADMIN_NAV_ITEMS: readonly AdminNavItem[] = [
  {
    key: "overview",
    label: "Overview",
    href: "/admin/overview",
    icon: LayoutDashboard,
  },
  {
    key: "site-content",
    label: "Site content",
    href: "/admin/site-content",
    icon: FileText,
  },
  {
    key: "events",
    label: "Events",
    href: "/admin/events",
    icon: Calendar,
  },
  {
    key: "recruitment",
    label: "Recruitment",
    href: "/admin/recruitment",
    icon: Users,
  },
  {
    key: "inquiries",
    label: "Inquiries",
    href: "/admin/inquiries",
    icon: MessageCircleQuestion,
  },
];

export function AdminShell({
  activeNav,
  title,
  subtitle,
  headerAction,
  children,
}: AdminShellProps) {
  const router = useRouter();
  const { site, session, isHydrated, mode, services } = useAppData();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const drawerId = useId();
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  const isAuthenticated = Boolean(session?.authenticated);

  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.replace("/admin/login");
    }
  }, [isHydrated, isAuthenticated, router]);

  useEffect(() => {
    if (!mobileOpen) return;

    const drawer = drawerRef.current;
    const trigger = menuTriggerRef.current;
    const background = [headerRef.current, mainRef.current];
    const previousInert = background.map((element) => element?.inert ?? false);
    background.forEach((element) => {
      if (element) element.inert = true;
    });
    const focusableSelector = 'a[href], button:not([disabled]), [tabindex="0"]';
    drawer?.querySelector<HTMLElement>(focusableSelector)?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileOpen(false);
      }
      if (event.key === "Tab") {
        const focusable = Array.from(
          drawer?.querySelectorAll<HTMLElement>(focusableSelector) ?? [],
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    const closeOnDesktop = () => {
      if (window.innerWidth >= 1280) setMobileOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", closeOnDesktop);

    return () => {
      background.forEach((element, index) => {
        if (element) element.inert = previousInert[index] ?? false;
      });
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", closeOnDesktop);
      if (trigger?.isConnected && window.innerWidth < 1280) trigger.focus();
    };
  }, [mobileOpen]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await services.auth.logout();
      setMobileOpen(false);
      router.replace("/admin/login");
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (!isHydrated) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="min-h-screen bg-[#F5F5FA] flex items-center justify-center px-6 text-[#4A5565] text-sm font-medium"
      >
        Checking admin session...
      </div>
    );
  }

  if (!isAuthenticated || !session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#F5F5FA] text-[#1C1B1F] flex flex-col">
      {/* Admin Topbar Navigation */}
      <header ref={headerRef} className="sticky top-0 z-40 w-full bg-[#FFFFFF] border-b-4 border-[#0038E1]">
        <div className="max-w-[1440px] mx-auto h-16 xl:h-[76px] px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 xl:gap-3 shrink-0 min-w-0">
            <Link
              href="/admin/overview"
              className="flex items-center gap-2 xl:gap-2.5 shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0038E1]"
            >
              <ContentImage
                asset={site.logoDark}
                className="h-7 lg:h-9 w-auto object-contain"
                priority
              />
              <span className="text-xs sm:text-sm font-medium text-[#4A5565]">
                Admin
              </span>
            </Link>

            {mode === "mock" ? (
              <Badge tone="info" className="hidden 2xl:inline-flex rounded-full">
                Preview / Mock Mode
              </Badge>
            ) : null}
          </div>

          {/* Desktop Horizontal Nav */}
          <nav
            aria-label="Admin navigation"
            className="hidden xl:flex items-center gap-4"
          >
            {ADMIN_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.key;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={[
                    "inline-flex min-h-11 items-center gap-1.5 py-2 text-[14px] whitespace-nowrap border-b-2 transition-colors",
                    "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0038E1]",
                    isActive
                      ? "text-[#0038E1] font-semibold border-[#0038E1]"
                      : "text-[#1C1B1F] font-normal border-transparent hover:text-[#0038E1]",
                  ].join(" ")}
                >
                  <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Desktop Session / Actions */}
          <div className="hidden xl:flex flex-col items-end justify-center shrink-0">
            <div className="flex items-center gap-2.5 text-xs">
              <span className="inline-flex items-center gap-1.5 text-[#1C1B1F] font-medium min-w-0">
                <ShieldCheck
                  className="w-4 h-4 text-[#0038E1] shrink-0"
                  aria-hidden="true"
                />
                <span
                  title={session.email}
                  className="max-w-[160px] truncate"
                >
                  {session.email}
                </span>
              </span>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="inline-flex min-h-11 items-center gap-1 text-[#FB4A2A] hover:text-[#B41B00] font-medium whitespace-nowrap transition-colors cursor-pointer disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0038E1]"
              >
                <LogOut className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Log out</span>
              </button>
            </div>
            <Link
              href="/"
              className="text-xs text-[#0038E1] hover:text-[#002BAA] underline underline-offset-4 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0038E1]"
            >
              ← View Home
            </Link>
          </div>

          {/* Mobile Hamburger Trigger */}
          <button
            ref={menuTriggerRef}
            type="button"
            aria-label="Toggle admin navigation"
            aria-expanded={mobileOpen}
            aria-controls={drawerId}
            onClick={() => setMobileOpen((prev) => !prev)}
            className="xl:hidden inline-flex items-center justify-center w-11 h-11 rounded-[5px] border border-[#E2E8F0] text-[#1C1B1F] hover:bg-[#F4F5F7] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0038E1]"
          >
            {mobileOpen ? (
              <X className="w-5 h-5" aria-hidden="true" />
            ) : (
              <Menu className="w-5 h-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </header>

      {/* Mobile Slide-Over Drawer */}
      {mobileOpen ? (
        <div
          data-testid="admin-mobile-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setMobileOpen(false);
            }
          }}
          className="fixed inset-0 z-50 bg-[#1C1B1F]/60 xl:hidden flex justify-end"
        >
          <div
            ref={drawerRef}
            id={drawerId}
            role="dialog"
            aria-modal="true"
            aria-label="Admin navigation drawer"
            className="w-full max-w-sm h-dvh bg-[#FFFFFF] border-l-2 border-[#001C26] flex flex-col justify-between gap-6 px-5 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] overflow-y-auto overscroll-contain"
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
                <div className="flex items-center gap-2">
                  <ContentImage
                    asset={site.logoDark}
                    className="h-9 w-auto object-contain"
                  />
                  <span className="text-sm font-medium text-[#4A5565]">
                    Admin
                  </span>
                </div>
                <button
                  type="button"
                  aria-label="Close admin navigation"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex items-center justify-center w-11 h-11 shrink-0 rounded-[5px] border border-[#E2E8F0] text-[#1C1B1F] hover:bg-[#F4F5F7] cursor-pointer focus-visible:outline-2 focus-visible:outline-[#0038E1]"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>

              {mode === "mock" ? (
                <Badge tone="info" className="rounded-full">
                  Preview / Mock Mode
                </Badge>
              ) : null}

              <nav aria-label="Mobile admin links" className="flex flex-col gap-1">
                {ADMIN_NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeNav === item.key;
                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      onClick={() => setMobileOpen(false)}
                      className={[
                        "flex items-center gap-3 py-3 px-3 rounded-lg text-base font-medium transition-colors",
                        isActive
                          ? "bg-[#A6C0FF]/30 text-[#0038E1]"
                          : "text-[#1C1B1F] hover:bg-[#F4F5F7]",
                      ].join(" ")}
                    >
                      <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="pt-6 border-t border-[#E2E8F0] space-y-4">
              <div className="text-sm text-[#4A5565] break-all">
                Signed in as{" "}
                <span className="font-medium text-[#1C1B1F]">
                  {session.email}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <Link
                  href="/"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex min-h-11 items-center text-sm font-medium text-[#0038E1] underline underline-offset-4"
                >
                  ← View Home
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-[#FB4A2A] hover:text-[#B41B00] cursor-pointer disabled:opacity-50"
                >
                  <LogOut className="w-4 h-4" aria-hidden="true" />
                  <span>Log out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Main Content */}
      <main ref={mainRef} className="flex-1 w-full min-w-0">
        <div className="max-w-[1440px] min-w-0 mx-auto px-4 sm:px-8 lg:px-12 py-6 sm:py-8 lg:py-10">
          {title ? (
            <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-[30px] font-medium text-[#1C1B1F] leading-tight">
                  {title}
                </h1>
                {subtitle ? (
                  <p className="mt-1.5 text-base sm:text-lg text-[#4A5565]">
                    {subtitle}
                  </p>
                ) : null}
              </div>
              {headerAction ? (
                <div className="shrink-0">{headerAction}</div>
              ) : null}
            </div>
          ) : null}

          {children}
        </div>
      </main>
    </div>
  );
}
