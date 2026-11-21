"use client";

import { useMemo, useState } from "react";
import { Calendar, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
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
      <div className="max-w-[1920px] mx-auto px-6 lg:px-16 xl:px-32 py-16 lg:py-24">
        <div className="max-w-3xl">
          <p className="text-[14px] font-medium leading-[22px] text-[#0038E1]">
            {timeline.eyebrow}
          </p>
          <h2 className="mt-2 text-3xl sm:text-4xl lg:text-[48px] font-normal leading-tight lg:leading-[60px] text-[#1C1B1F]">
            {timeline.heading}
          </h2>
          <p className="mt-3 text-base sm:text-[18px] leading-[28px] text-[#4A5565]">
            {timeline.subtitle}
          </p>
        </div>

        {visibleEvents.length === 0 ? (
          <div className="mt-10 border border-border bg-[#F5F5FA] rounded-[20px] p-8 text-base text-dark-gray">
            No scheduled events or news items are published on the roadmap yet.
          </div>
        ) : (
          <div className="relative mt-10 lg:mt-12">
            <div
              aria-hidden="true"
              className="hidden md:block absolute left-[15px] top-6 bottom-6 w-[2px] bg-[#1C1B1F]/25"
            />

            <ol className="space-y-5">
              {visibleEvents.map((item, idx) => {
                const indexLabel = String(idx + 1).padStart(2, "0");
                const accentColor =
                  TIMELINE_ACCENTS[idx % TIMELINE_ACCENTS.length];

                return (
                  <li
                    key={item.id}
                    className="relative md:pl-12 flex items-stretch"
                  >
                    <span
                      aria-hidden="true"
                      className="hidden md:flex absolute left-[5px] top-1/2 -translate-y-1/2 w-[22px] h-[22px] rounded-full bg-[#A9E041] border-2 border-[#1C1B1F]"
                    />

                    <div
                      onClick={() => setSelectedEvent(item)}
                      className="w-full bg-[#F5F5FA] border border-[#A1A7B4] hover:border-[#0038E1] rounded-[20px] sm:rounded-[27px] p-5 sm:p-7 transition-colors cursor-pointer grid grid-cols-1 lg:grid-cols-[240px_1fr_auto] gap-5 lg:gap-8 items-start lg:items-center"
                    >
                      <div className="min-w-0 space-y-2.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-[#1C1B1F] bg-white border border-[#D6D9E3] px-2 py-0.5 rounded">
                            {indexLabel}
                          </span>
                          <Badge
                            tone={item.category === "Event" ? "info" : "teal"}
                          >
                            {item.category}
                          </Badge>
                        </div>

                        <p className="font-mono text-xs text-[#4A5565]">
                          {item.marker}
                        </p>

                        <div className="space-y-1 text-sm text-[#4A5565]">
                          <p className="flex items-center gap-1.5 font-mono">
                            <Calendar
                              className="w-3.5 h-3.5 shrink-0 text-[#0038E1]"
                              aria-hidden="true"
                            />
                            <span>{item.dateLabel}</span>
                          </p>
                          <p className="flex items-center gap-1.5">
                            <MapPin
                              className="w-3.5 h-3.5 shrink-0 text-[#0038E1]"
                              aria-hidden="true"
                            />
                            <span className="truncate">{item.location}</span>
                          </p>
                        </div>
                      </div>

                      <div className="min-w-0">
                        <h3 className="text-xl sm:text-2xl lg:text-[26px] font-medium leading-snug text-[#1C1B1F]">
                          {item.title}
                        </h3>
                        <div
                          aria-hidden="true"
                          className="mt-2.5 w-[64px] h-[5px]"
                          style={{ backgroundColor: accentColor }}
                        />
                        <p className="mt-3 text-base sm:text-[18px] leading-[28px] text-[#4A5565]">
                          {item.subtitle}
                        </p>
                      </div>

                      <div className="flex items-center lg:justify-end shrink-0">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedEvent(item);
                          }}
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
