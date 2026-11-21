"use client";

import { Calendar, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ContentImage } from "@/components/ui/ContentImage";
import { Modal } from "@/components/ui/Modal";
import type { EventItem } from "@/lib/types/events";

export interface EventDetailModalProps {
  event: EventItem | null;
  onClose: () => void;
}

export function EventDetailModal({ event, onClose }: EventDetailModalProps) {
  return (
    <Modal
      open={Boolean(event)}
      onClose={onClose}
      title={event?.title ?? ""}
      subtitle={event?.subtitle}
      maxWidthClass="max-w-2xl"
      footer={
        <div className="flex justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      {event ? (
        <div className="space-y-5">
          {event.coverImage ? (
            <div className="overflow-hidden border border-border bg-canvas-muted">
              <ContentImage
                asset={event.coverImage}
                className="w-full max-h-[300px] object-cover"
              />
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2.5">
            <Badge tone={event.category === "Event" ? "info" : "teal"}>
              {event.category}
            </Badge>
            <span className="inline-flex items-center font-mono text-xs font-medium text-dark-gray bg-canvas-muted border border-border px-2.5 py-1">
              {event.marker}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-canvas border border-border p-4 text-sm text-ink">
            <div className="flex items-start gap-2.5">
              <Calendar
                className="w-4 h-4 mt-0.5 shrink-0 text-primary"
                aria-hidden="true"
              />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray">
                  Date & Time
                </p>
                <p className="mt-0.5 font-mono text-sm text-ink">
                  {event.dateLabel}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <MapPin
                className="w-4 h-4 mt-0.5 shrink-0 text-primary"
                aria-hidden="true"
              />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray">
                  Location
                </p>
                <p className="mt-0.5 text-sm text-ink">{event.location}</p>
              </div>
            </div>
          </div>

          <p className="text-base leading-relaxed text-ink whitespace-pre-line">
            {event.description}
          </p>
        </div>
      ) : null}
    </Modal>
  );
}
