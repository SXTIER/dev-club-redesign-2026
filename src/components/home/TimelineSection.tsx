"use client";

import { useMemo, useState } from "react";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAppData } from "@/context/AppDataContext";
import type { EventItem } from "@/lib/types/events";
import { EventDetailModal } from "./EventDetailModal";

const TIMELINE_ACCENTS = [
  "#A9E041",
  "#0038E1",
  "#FB4A2A",
  "#E25BE9",
  "#F8DD2F",
];

export function TimelineSection() {
  const { home, events } = useAppData();
  const { timeline } = home;
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);

  const visibleEvents = useMemo(() => {
    return events
      .filter((item) => item.status === "Published" && item.showOnHome === true)
      .sort((a, b) => {
        if (a.order !== b.order) return a.order - b.order;
        return b.updatedAt.localeCompare(a.updatedAt);
      });
  }, [events]);

  return (
    <section id="timeline" className="scroll-mt-28 w-full bg-[#FFFFFF]">
      <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 xl:px-16 py-12 lg:py-16">
        <div className="max-w-3xl">
          <p className="text-[13px] font-medium leading-[20px] text-[#0038E1]">
            {timeline.eyebrow}
          </p>
          <h2 className="mt-2 text-2xl sm:text-3xl lg:text-[38px] font-normal leading-tight lg:leading-[48px] text-[#1C1B1F]">
            {timeline.heading}
          </h2>
          <p className="mt-2.5 text-sm sm:text-base leading-[26px] text-[#4A5565]">
            {timeline.subtitle}
          </p>
        </div>

        {visibleEvents.length === 0 ? (
          <div className="mt-8 border border-border bg-[#F5F5FA] rounded-[16px] p-6 text-sm text-dark-gray">
            No scheduled events or news items are published on the roadmap yet.
          </div>
        ) : (
          <div className="relative mt-8 lg:mt-10">
            <div
              aria-hidden="true"
              className="absolute left-[4px] md:left-[13px] top-6 bottom-6 w-[2px] bg-[#1C1B1F]/20"
            />

            <ol className="space-y-4">
              {visibleEvents.map((item, idx) => {
                const indexLabel = String(idx + 1).padStart(2, "0");
                const accentColor =
                  TIMELINE_ACCENTS[idx % TIMELINE_ACCENTS.length];

                return (
                  <li
                    key={item.id}
                    className="relative pl-5 md:pl-10 flex min-w-0 items-stretch"
                  >
                    <span
                      aria-hidden="true"
                      className="absolute left-0 md:left-[4px] top-7 md:top-1/2 md:-translate-y-1/2 w-[10px] h-[10px] md:w-[20px] md:h-[20px] rounded-full bg-[#A9E041] border-2 border-[#1C1B1F]"
                    />

                    <div
                      className="relative min-w-0 w-full bg-[#F5F5FA] border border-[#A1A7B4] hover:border-[#0038E1] focus-within:border-[#0038E1] rounded-[16px] sm:rounded-[20px] p-4 sm:p-5 lg:p-6 transition-colors grid grid-cols-1 lg:grid-cols-[190px_1fr_auto] gap-3 sm:gap-4 lg:gap-6 items-start lg:items-center"
                    >
                      <div className="min-w-0 flex flex-wrap lg:flex-col items-center lg:items-start justify-between lg:justify-center gap-2">
                        <span className="shrink-0 text-xs font-semibold text-[#1C1B1F] bg-white border border-[#D6D9E3] px-2.5 py-0.5 rounded">
                          {indexLabel}
                        </span>
                        <p className="min-w-0 flex items-start gap-1.5 text-xs sm:text-sm font-medium text-[#4A5565] break-words">
                          <Calendar
                            className="mt-0.5 w-3.5 h-3.5 shrink-0 text-[#0038E1]"
                            aria-hidden="true"
                          />
                          <span className="min-w-0">{item.dateLabel}</span>
                        </p>
                      </div>

                      <div className="min-w-0">
                        <h3 className="text-lg sm:text-xl lg:text-[22px] font-medium leading-snug text-[#1C1B1F] break-words">
                          {item.title}
                        </h3>
                        <div
                          aria-hidden="true"
                          className="mt-2 w-[52px] h-[4px]"
                          style={{ backgroundColor: accentColor }}
                        />
                        <p className="mt-2.5 text-sm sm:text-[15px] leading-[24px] text-[#4A5565] break-words">
                          {item.subtitle}
                        </p>
                      </div>

                      <div className="flex min-w-0 items-center lg:justify-end">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="min-h-11 w-full sm:w-auto whitespace-normal after:absolute after:inset-0 after:rounded-[inherit] after:content-['']"
                          aria-label={`View details: ${item.title}`}
                          onClick={() => setSelectedEvent(item)}
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </div>

      <EventDetailModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </section>
  );
}
