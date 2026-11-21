"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useAppData } from "@/context/AppDataContext";
import { AskQuestionModal } from "./AskQuestionModal";

export function FaqSection() {
  const { home } = useAppData();
  const { faq } = home;

  const [openIds, setOpenIds] = useState<string[]>(() =>
    faq.items[0] ? [faq.items[0].id] : [],
  );
  const [askOpen, setAskOpen] = useState(false);

  const toggleItem = (id: string) => {
    setOpenIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  return (
    <section id="faq" className="scroll-mt-28 w-full bg-[#FFFFFF]">
      <div className="max-w-[1920px] mx-auto px-6 lg:px-16 xl:px-32 py-16 lg:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
          <div className="lg:col-span-4 min-w-0">
            <p className="text-[14px] font-medium leading-[22px] text-[#0038E1]">
              {faq.eyebrow}
            </p>
            <h2 className="mt-3 text-3xl sm:text-4xl lg:text-[44px] font-normal leading-tight lg:leading-[56px] text-[#1C1B1F]">
              {faq.heading}
            </h2>
          </div>

          <div className="lg:col-span-8 min-w-0">
            <div className="divide-y divide-[#1C1B1F]/30 border-b border-[#1C1B1F]/30">
              {faq.items.map((item) => {
                const isOpen = openIds.includes(item.id);
                const panelId = `faq-panel-${item.id}`;

                return (
                  <div key={item.id}>
                    <h3>
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        aria-controls={panelId}
                        onClick={() => toggleItem(item.id)}
                        className="w-full py-5 sm:py-6 flex items-center justify-between gap-4 text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0038E1]"
                      >
                        <span className="text-xl sm:text-2xl lg:text-[28px] font-medium leading-snug lg:leading-[40px] text-[#1C1B1F]">
                          {item.question}
                        </span>
                        <span
                          aria-hidden="true"
                          className="shrink-0 w-6 text-center text-2xl lg:text-[28px] font-medium leading-none text-[#1C1B1F]"
                        >
                          {isOpen ? "-" : "+"}
                        </span>
                      </button>
                    </h3>

                    <div
                      id={panelId}
                      hidden={!isOpen}
                      className="pb-6 pr-8 text-base sm:text-lg lg:text-[20px] leading-relaxed lg:leading-[34px] text-[#1C1B1F]"
                    >
                      <p>{item.answer}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8">
              <Button
                type="button"
                variant="primary"
                size="lg"
                onClick={() => setAskOpen(true)}
                className="border-0"
              >
                <span>{faq.askButtonLabel}</span>
                <span aria-hidden="true" className="text-xs leading-none">
                  ▲
                </span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <AskQuestionModal open={askOpen} onClose={() => setAskOpen(false)} />
    </section>
  );
}
