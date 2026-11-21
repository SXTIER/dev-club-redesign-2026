"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PublicFooter } from "@/components/public/PublicFooter";
import { PublicNavbar } from "@/components/public/PublicNavbar";
import RecruitmentClosedView from "@/components/recruitment/RecruitmentClosedView";
import RecruitmentOpenedForm from "@/components/recruitment/RecruitmentOpenedForm";
import { useAppData } from "@/context/AppDataContext";

function JoiningInformationContent() {
  const searchParams = useSearchParams();
  const { recruitment } = useAppData();

  const preview = searchParams?.get("preview");
  const isOpen =
    preview === "open"
      ? true
      : preview === "closed"
        ? false
        : recruitment.isOpen;

  return isOpen ? (
    <RecruitmentOpenedForm content={recruitment} />
  ) : (
    <RecruitmentClosedView content={recruitment} />
  );
}

export default function JoiningInformationPage() {
  return (
    <div className="min-h-screen flex flex-col bg-surface text-ink">
      <PublicNavbar />
      <main id="main-content" className="flex-1">
        <Suspense
          fallback={
            <div className="max-w-[1920px] mx-auto px-6 lg:px-16 xl:px-32 py-16 text-sm text-gray">
              Loading joining information...
            </div>
          }
        >
          <JoiningInformationContent />
        </Suspense>
      </main>
      <PublicFooter />
    </div>
  );
}
