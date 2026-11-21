"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppData } from "@/context/AppDataContext";

export default function AdminIndexPage() {
  const router = useRouter();
  const { session, isHydrated } = useAppData();

  useEffect(() => {
    if (!isHydrated) return;
    if (session?.authenticated) {
      router.replace("/admin/overview");
    } else {
      router.replace("/admin/login");
    }
  }, [isHydrated, session, router]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="min-h-screen bg-[#F5F5FA] flex items-center justify-center px-6 text-[#4A5565] text-sm font-medium"
    >
      Redirecting to admin portal...
    </div>
  );
}
