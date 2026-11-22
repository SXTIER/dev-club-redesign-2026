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
    <div className="w-full bg-white py-8 sm:py-12">
      <div className="mx-auto w-full max-w-[760px] px-5 sm:px-8">
        <div className="mb-5">
          <Link
            href="/"
            className="inline-flex items-center text-[13px] font-medium leading-[1.5] text-[#0038E1] hover:underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0038E1]"
          >
            {legal.backToHomeLabel}
          </Link>
        </div>

        <article lang={lang} className="min-w-0">
          <header className="mb-6 border-b border-[#E2E8F0] pb-5">
            <p className="mb-2 text-[12px] leading-[1.5] text-[#4A5565]">
              {doc.lastUpdated}
            </p>
            <h1 className="text-[24px] sm:text-[30px] font-bold leading-[1.3] text-[#1C1B1F] [overflow-wrap:anywhere]">
              {doc.title}
            </h1>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
              <p className="text-[13px] sm:text-[14px] leading-[1.55] text-[#4A5565] [overflow-wrap:anywhere]">
                {doc.subtitle}
              </p>

              <div
                role="group"
                aria-label="Language switch"
                className="inline-flex shrink-0 items-center gap-1.5 text-[14px] italic leading-[1.55]"
              >
                <button
                  type="button"
                  aria-pressed={lang === "en"}
                  onClick={() => setLang("en")}
                  className={`cursor-pointer bg-transparent px-0.5 italic transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0038E1] ${
                    lang === "en"
                      ? "font-bold text-[#0038E1]"
                      : "font-normal text-[#757E91] hover:text-[#1C1B1F]"
                  }`}
                >
                  EN
                </button>
                <span aria-hidden="true" className="select-none italic text-[#4A5565]">
                  /
                </span>
                <button
                  type="button"
                  aria-pressed={lang === "th"}
                  onClick={() => setLang("th")}
                  className={`cursor-pointer bg-transparent px-0.5 italic transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0038E1] ${
                    lang === "th"
                      ? "font-bold text-[#0038E1]"
                      : "font-normal text-[#757E91] hover:text-[#1C1B1F]"
                  }`}
                >
                  TH
                </button>
              </div>
            </div>
          </header>

          <div className="space-y-5">
            {doc.sections.map((section, sectionIndex) => (
              <section
                key={`${lang}-${sectionIndex}-${section.heading}`}
                className="min-w-0 space-y-2"
              >
                <h2 className="text-[16px] sm:text-[17px] font-bold leading-[1.5] text-[#1C1B1F] [overflow-wrap:anywhere]">
                  {section.heading}
                </h2>
                {section.paragraphs.map((paragraph, paragraphIndex) => (
                  <p
                    key={paragraphIndex}
                    className={`text-[14px] sm:text-[15px] ${bodyLeading} text-[#4A5565] [overflow-wrap:anywhere]`}
                  >
                    {paragraph}
                  </p>
                ))}
                {section.bullets && section.bullets.length > 0 ? (
                  <ul className="list-disc space-y-1 pl-5 pt-0.5">
                    {section.bullets.map((bullet, bulletIndex) => (
                      <li
                        key={bulletIndex}
                        className={`text-[14px] sm:text-[15px] ${bodyLeading} text-[#4A5565] [overflow-wrap:anywhere]`}
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
              className="mt-8 border-t border-[#E2E8F0] pt-6"
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {credits.map((credit, creditIndex) => (
                  <div
                    key={`${creditIndex}-${credit.name}`}
                    className="min-w-0 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4"
                  >
                    <p className="text-[15px] font-bold leading-[1.4] text-[#1C1B1F] [overflow-wrap:anywhere]">
                      {credit.name}
                    </p>
                    <p className="mt-1 text-[13px] font-medium leading-[1.5] text-[#0038E1] [overflow-wrap:anywhere]">
                      {credit.role}
                    </p>
                    <p className="mt-1 text-[12px] leading-[1.5] text-[#757E91] [overflow-wrap:anywhere]">
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
