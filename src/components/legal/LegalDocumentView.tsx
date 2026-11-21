"use client";

import { useState } from "react";
import Link from "next/link";
import { useAppData } from "@/context/AppDataContext";

export type LegalDocumentKey =
  | "privacyPolicy"
  | "termsOfUse"
  | "acknowledgement";

export interface LegalDocumentViewProps {
  documentKey: LegalDocumentKey;
}

export function LegalDocumentView({ documentKey }: LegalDocumentViewProps) {
  const { legal } = useAppData();
  const [lang, setLang] = useState<"en" | "th">("en");

  const doc = legal[documentKey][lang];
  const credits =
    documentKey === "acknowledgement" ? legal.acknowledgement.credits : null;
  const bodyLeading = lang === "th" ? "leading-[1.8]" : "leading-[1.65]";

  return (
    <div className="w-full bg-white py-10 sm:py-16">
      <div className="mx-auto w-full max-w-[840px] px-5 sm:px-8">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center text-[14px] font-medium leading-[1.55] text-[#0038E1] hover:underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0038E1]"
          >
            {legal.backToHomeLabel}
          </Link>
        </div>

        <article lang={lang} className="min-w-0">
          <header className="mb-8 border-b border-[#E2E8F0] pb-6">
            <p className="mb-3 font-mono text-[12px] leading-[1.55] text-[#4A5565]">
              {doc.lastUpdated}
            </p>
            <h1 className="text-[28px] sm:text-[36px] font-bold leading-[1.3] text-[#1C1B1F] [overflow-wrap:anywhere]">
              {doc.title}
            </h1>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
              <p className="text-[14px] leading-[1.55] text-[#4A5565] [overflow-wrap:anywhere]">
                {doc.subtitle}
              </p>

              <div
                role="group"
                aria-label="Language switch"
                className="inline-flex shrink-0 items-center rounded-full border border-[#E2E8F0] bg-[#F8FAFC] p-0.5"
              >
                <button
                  type="button"
                  aria-pressed={lang === "en"}
                  onClick={() => setLang("en")}
                  className={`rounded-full px-3 py-1 text-[13px] font-semibold leading-[1.4] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0038E1] ${
                    lang === "en"
                      ? "bg-[#0038E1] text-white"
                      : "text-[#757E91] hover:text-[#1C1B1F]"
                  }`}
                >
                  EN
                </button>
                <button
                  type="button"
                  aria-pressed={lang === "th"}
                  onClick={() => setLang("th")}
                  className={`rounded-full px-3 py-1 text-[13px] font-semibold leading-[1.4] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0038E1] ${
                    lang === "th"
                      ? "bg-[#0038E1] text-white"
                      : "text-[#757E91] hover:text-[#1C1B1F]"
                  }`}
                >
                  TH
                </button>
              </div>
            </div>
          </header>

          <div className="space-y-6">
            {doc.sections.map((section, sectionIndex) => (
              <section
                key={`${lang}-${sectionIndex}-${section.heading}`}
                className="min-w-0 space-y-2.5"
              >
                <h2 className="text-[18px] font-bold leading-[1.55] text-[#1C1B1F] [overflow-wrap:anywhere]">
                  {section.heading}
                </h2>
                {section.paragraphs.map((paragraph, paragraphIndex) => (
                  <p
                    key={paragraphIndex}
                    className={`text-[15px] sm:text-[16px] ${bodyLeading} text-[#4A5565] [overflow-wrap:anywhere]`}
                  >
                    {paragraph}
                  </p>
                ))}
                {section.bullets && section.bullets.length > 0 ? (
                  <ul className="list-disc space-y-1.5 pl-6 pt-1">
                    {section.bullets.map((bullet, bulletIndex) => (
                      <li
                        key={bulletIndex}
                        className={`text-[15px] sm:text-[16px] ${bodyLeading} text-[#4A5565] [overflow-wrap:anywhere]`}
                      >
                        {bullet}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </div>

          {credits && credits.length > 0 ? (
            <section
              aria-label="Developer and committee credits"
              className="mt-10 border-t border-[#E2E8F0] pt-8"
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {credits.map((credit, creditIndex) => (
                  <div
                    key={`${creditIndex}-${credit.name}`}
                    className="min-w-0 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-5"
                  >
                    <p className="text-[16px] font-bold leading-[1.4] text-[#1C1B1F] [overflow-wrap:anywhere]">
                      {credit.name}
                    </p>
                    <p className="mt-1 text-[14px] font-medium leading-[1.5] text-[#0038E1] [overflow-wrap:anywhere]">
                      {credit.role}
                    </p>
                    <p className="mt-1 text-[13px] leading-[1.5] text-[#757E91] [overflow-wrap:anywhere]">
                      {credit.affiliation}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </article>
      </div>
    </div>
  );
}
