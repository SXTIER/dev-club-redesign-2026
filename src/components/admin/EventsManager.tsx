"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  Calendar,
  Check,
  Edit3,
  Globe,
  MapPin,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ContentImage } from "@/components/ui/ContentImage";
import { Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { useAppData } from "@/context/AppDataContext";
import type { EventItem } from "@/lib/types/events";
import { EventEditorModal } from "./EventEditorModal";

type EventsFilterKey =
  | "all"
  | "Event"
  | "News"
  | "Published"
  | "Draft"
  | "onHome";

const PAGE_SIZE = 10;

const MONTH_NAME_TO_INDEX: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

function matchesCurrentMonth(event: EventItem, now: Date): boolean {
  const month = now.getMonth();
  const year = now.getFullYear();

  const match =
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b[\s,.-]*(\d{4})\b/i.exec(
      event.dateLabel,
    );
  if (match) {
    const parsedMonth = MONTH_NAME_TO_INDEX[match[1].toLowerCase()];
    const parsedYear = Number.parseInt(match[2], 10);
    return parsedMonth === month && parsedYear === year;
  }

  const fallback = new Date(event.updatedAt);
  if (!Number.isNaN(fallback.getTime())) {
    return fallback.getMonth() === month && fallback.getFullYear() === year;
  }
  return false;
}

function CoverThumbnail({
  item,
  index,
}: {
  item: EventItem;
  index: number;
}) {
  const markerNumber = String(index + 1).padStart(2, "0");

  if (item.coverImage) {
    return (
      <div className="w-24 h-16 shrink-0 rounded-[5px] border border-[#E2E8F0] bg-[#E8ECF4] overflow-hidden flex items-center justify-center">
        <ContentImage
          asset={item.coverImage}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={[
        "w-24 h-16 shrink-0 rounded-[5px] flex items-start justify-start p-2.5",
        index % 2 === 0 ? "bg-[#0038E1]" : "bg-[#1C1B1F]",
      ].join(" ")}
    >
      <span className="font-mono text-sm font-medium text-white">
        {markerNumber}
      </span>
    </div>
  );
}

export function EventsManager() {
  const { events, services } = useAppData();

  const [activeFilter, setActiveFilter] = useState<EventsFilterKey>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EventItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

  const counts = useMemo(() => {
    const now = new Date();
    let eventCategory = 0;
    let newsCategory = 0;
    let published = 0;
    let draft = 0;
    let onHome = 0;
    let inMonth = 0;

    for (const item of events) {
      if (item.category === "Event") eventCategory += 1;
      else newsCategory += 1;

      if (item.status === "Published") published += 1;
      else draft += 1;

      if (item.showOnHome) onHome += 1;
      if (matchesCurrentMonth(item, now)) inMonth += 1;
    }

    return {
      total: events.length,
      eventCategory,
      newsCategory,
      published,
      draft,
      onHome,
      inMonth,
    };
  }, [events]);

  const currentMonthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        month: "short",
        year: "numeric",
      }).format(new Date()),
    [],
  );

  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return events.filter((item) => {
      if (activeFilter === "Event" && item.category !== "Event") return false;
      if (activeFilter === "News" && item.category !== "News") return false;
      if (activeFilter === "Published" && item.status !== "Published")
        return false;
      if (activeFilter === "Draft" && item.status !== "Draft") return false;
      if (activeFilter === "onHome" && !item.showOnHome) return false;

      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q) ||
        item.marker.toLowerCase().includes(q) ||
        item.dateLabel.toLowerCase().includes(q)
      );
    });
  }, [events, activeFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);

  const pagedEvents = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredEvents.slice(start, start + PAGE_SIZE);
  }, [filteredEvents, safePage]);

  const nextOrder = useMemo(
    () => events.reduce((max, evt) => Math.max(max, evt.order), 0) + 1,
    [events],
  );

  const openCreateModal = () => {
    setEditingEvent(null);
    setEditorOpen(true);
  };

  const openEditModal = (item: EventItem) => {
    setEditingEvent(item);
    setEditorOpen(true);
  };

  const handleToggleStatus = async (item: EventItem) => {
    if (busyId) return;
    const nextStatus = item.status === "Published" ? "Draft" : "Published";
    setBusyId(item.id);
    setNotice(null);
    try {
      await services.events.updateEvent(item.id, { status: nextStatus });
      setNotice({
        tone: "success",
        message: `"${item.title}" is now ${nextStatus}.`,
      });
    } catch (err) {
      setNotice({
        tone: "error",
        message:
          err instanceof Error ? err.message : "Failed to update event status.",
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleShowOnHome = async (item: EventItem) => {
    if (busyId) return;
    const nextShow = !item.showOnHome;
    setBusyId(item.id);
    setNotice(null);
    try {
      await services.events.updateEvent(item.id, { showOnHome: nextShow });
      setNotice({
        tone: "success",
        message: nextShow
          ? `"${item.title}" enabled for Home / Event Roadmap.`
          : `"${item.title}" hidden from Home / Event Roadmap.`,
      });
    } catch (err) {
      setNotice({
        tone: "error",
        message:
          err instanceof Error
            ? err.message
            : "Failed to update Home visibility.",
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    setNotice(null);
    try {
      await services.events.deleteEvent(deleteTarget.id);
      setNotice({
        tone: "success",
        message: `Deleted "${deleteTarget.title}" from Events & News.`,
      });
      setDeleteTarget(null);
    } catch (err) {
      setNotice({
        tone: "error",
        message:
          err instanceof Error ? err.message : "Failed to delete event item.",
      });
    } finally {
      setDeleting(false);
    }
  };

  const filterButtons: Array<{
    key: EventsFilterKey;
    label: string;
    count: number;
  }> = [
    { key: "all", label: "All", count: counts.total },
    { key: "Event", label: "Event", count: counts.eventCategory },
    { key: "News", label: "News", count: counts.newsCategory },
    { key: "Published", label: "Published", count: counts.published },
    { key: "Draft", label: "Draft", count: counts.draft },
    { key: "onHome", label: "On Home", count: counts.onHome },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Summary Pills + Primary Add CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div
          aria-label="Events summary counts"
          className="flex flex-wrap items-center gap-2.5"
        >
          <span className="inline-flex items-center gap-2 rounded-[5px] border border-[#A1A7B4] bg-white px-3.5 py-2 text-sm text-[#1C1B1F]">
            <span className="text-[#4A5565]">Total</span>
            <span className="font-mono font-semibold">{counts.total}</span>
          </span>
          <span className="inline-flex items-center gap-2 rounded-[5px] border border-[#A9E041]/60 bg-[#E7FDA7]/60 px-3.5 py-2 text-sm text-[#548000]">
            <span>Published</span>
            <span className="font-mono font-semibold">{counts.published}</span>
          </span>
          <span className="inline-flex items-center gap-2 rounded-[5px] border border-[#FAA100]/50 bg-[#FFF194]/70 px-3.5 py-2 text-sm text-[#AA5000]">
            <span>Draft</span>
            <span className="font-mono font-semibold">{counts.draft}</span>
          </span>
          <span className="inline-flex items-center gap-2 rounded-[5px] border border-[#0038E1]/25 bg-[#A6C0FF]/35 px-3.5 py-2 text-sm text-[#002BAA]">
            <span>On Home</span>
            <span className="font-mono font-semibold">{counts.onHome}</span>
          </span>
        </div>

        <Button
          type="button"
          variant="primary"
          onClick={openCreateModal}
          className="rounded-[5px] border-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />+ Add Event / News
        </Button>
      </div>

      {/* Inline Feedback Notice */}
      {notice ? (
        <div
          role={notice.tone === "error" ? "alert" : "status"}
          className={[
            "rounded-[10px] border px-4 py-3 text-sm font-medium flex items-start gap-2.5",
            notice.tone === "error"
              ? "border-[#FB4A2A] bg-[#FAAF98]/35 text-[#B41B00]"
              : "border-[#A9E041] bg-[#E7FDA7]/65 text-[#548000]",
          ].join(" ")}
        >
          {notice.tone === "error" ? (
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
          ) : (
            <Check className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
          )}
          <span>{notice.message}</span>
        </div>
      ) : null}

      {/* Filter Pills + Search */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div
          role="group"
          aria-label="Filter events and news"
          className="flex flex-wrap items-center gap-2"
        >
          {filterButtons.map((pill) => {
            const active = activeFilter === pill.key;
            return (
              <button
                key={pill.key}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setActiveFilter(pill.key);
                  setCurrentPage(1);
                }}
                className={[
                  "h-10 px-3.5 rounded-[5px] text-sm sm:text-base transition-colors cursor-pointer whitespace-nowrap",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0038E1]",
                  active
                    ? "bg-[#0038E1] text-white font-medium"
                    : "bg-white border border-[#A1A7B4] text-[#0038E1] hover:bg-[#F4F5F7]",
                ].join(" ")}
              >
                {pill.label} ({pill.count})
              </button>
            );
          })}
        </div>

        <div className="relative w-full xl:w-96">
          <Search
            className="w-4 h-4 text-[#757E91] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setCurrentPage(1);
            }}
            aria-label="Search events and news"
            placeholder="Search title, category, or location..."
            className="w-full h-11 pl-10 pr-3.5 rounded-[5px] border border-[#A1A7B4] bg-white text-sm sm:text-base text-[#1C1B1F] placeholder:text-[#4A5565] focus:outline-none focus:border-[#0038E1]"
          />
        </div>
      </div>

      {/* Main Events Table / Mobile Cards Container */}
      <div className="bg-white border border-[#A1A7B4] rounded-[16px] overflow-hidden">
        <div className="px-5 sm:px-6 py-4 sm:py-5 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-xl sm:text-[24px] font-medium text-[#1C1B1F]">
            Event Roadmap
          </h2>
          <p className="text-sm text-[#4A5565]">
            {counts.inMonth} in {currentMonthLabel} · {counts.onHome} on Home
          </p>
        </div>

        {pagedEvents.length === 0 ? (
          <div className="px-6 py-12 text-center space-y-2">
            <p className="text-base font-medium text-[#1C1B1F]">
              No matching events or news items found.
            </p>
            <p className="text-sm text-[#4A5565]">
              Try adjusting your filter pills or search query, or click + Add
              Event / News.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table (>= 1024px) */}
            <div
              data-testid="events-desktop-table"
              className="hidden lg:block overflow-x-auto"
            >
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-[13px] font-medium text-[#4A5565]">
                    <th scope="col" className="py-3.5 pl-6 pr-3">
                      Cover
                    </th>
                    <th scope="col" className="py-3.5 px-3">
                      Title
                    </th>
                    <th scope="col" className="py-3.5 px-3">
                      Category
                    </th>
                    <th scope="col" className="py-3.5 px-3">
                      Date &amp; Location
                    </th>
                    <th scope="col" className="py-3.5 px-3">
                      Status
                    </th>
                    <th scope="col" className="py-3.5 px-3">
                      Home
                    </th>
                    <th scope="col" className="py-3.5 pl-3 pr-6 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#A1A7B4]/60">
                  {pagedEvents.map((item, idx) => {
                    const globalIdx = (safePage - 1) * PAGE_SIZE + idx;
                    const isBusy = busyId === item.id;

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-[#F8FAFC] transition-colors"
                      >
                        <td className="py-3.5 pl-6 pr-3 align-middle">
                          <CoverThumbnail item={item} index={globalIdx} />
                        </td>

                        <td className="py-3.5 px-3 align-middle max-w-[340px]">
                          <p className="text-base font-medium text-[#1C1B1F] truncate">
                            {item.title}
                          </p>
                          <p className="mt-0.5 text-xs text-[#4A5565] truncate">
                            {item.marker} · {item.subtitle}
                          </p>
                        </td>

                        <td className="py-3.5 px-3 align-middle">
                          <Badge
                            tone={item.category === "Event" ? "info" : "teal"}
                            className="rounded-[5px]"
                          >
                            {item.category}
                          </Badge>
                        </td>

                        <td className="py-3.5 px-3 align-middle max-w-[260px]">
                          <p className="font-mono text-sm text-[#1C1B1F] whitespace-nowrap">
                            {item.dateLabel}
                          </p>
                          <p className="mt-0.5 text-xs text-[#4A5565] truncate">
                            {item.location}
                          </p>
                        </td>

                        <td className="py-3.5 px-3 align-middle">
                          <Badge
                            tone={
                              item.status === "Published" ? "success" : "warning"
                            }
                            className="rounded-[5px]"
                          >
                            {item.status}
                          </Badge>
                        </td>

                        <td className="py-3.5 px-3 align-middle">
                          <button
                            type="button"
                            disabled={isBusy}
                            aria-pressed={item.showOnHome}
                            aria-label={`Toggle Show on Home for ${item.title}`}
                            onClick={() => void handleToggleShowOnHome(item)}
                            className={[
                              "inline-flex items-center gap-1.5 h-8 px-2.5 rounded-[5px] text-xs font-semibold border transition-colors cursor-pointer disabled:opacity-50",
                              item.showOnHome
                                ? "bg-[#A6C0FF]/40 border-[#0038E1]/30 text-[#002BAA]"
                                : "bg-[#F4F5F7] border-[#E2E8F0] text-[#4A5565] hover:border-[#A1A7B4]",
                            ].join(" ")}
                          >
                            <Globe className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>{item.showOnHome ? "On Home" : "Hidden"}</span>
                          </button>
                        </td>

                        <td className="py-3.5 pl-3 pr-6 align-middle text-right">
                          <div className="inline-flex items-center justify-end gap-3">
                            <button
                              type="button"
                              aria-label={`Edit ${item.title}`}
                              onClick={() => openEditModal(item)}
                              className="text-sm font-medium text-[#0038E1] hover:text-[#002BAA] hover:underline underline-offset-4 cursor-pointer"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              aria-label={`${
                                item.status === "Published"
                                  ? "Unpublish"
                                  : "Publish"
                              } ${item.title}`}
                              onClick={() => void handleToggleStatus(item)}
                              className="text-sm font-medium text-[#4A5565] hover:text-[#1C1B1F] hover:underline underline-offset-4 cursor-pointer disabled:opacity-50"
                            >
                              {item.status === "Published"
                                ? "Unpublish"
                                : "Publish"}
                            </button>
                            <button
                              type="button"
                              aria-label={`Delete ${item.title}`}
                              onClick={() => setDeleteTarget(item)}
                              className="text-sm font-medium text-[#B41B00] hover:underline underline-offset-4 cursor-pointer"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile & Tablet Stacked Cards (< 1024px) */}
            <div
              data-testid="events-mobile-cards"
              className="lg:hidden divide-y divide-[#E2E8F0]"
            >
              {pagedEvents.map((item, idx) => {
                const globalIdx = (safePage - 1) * PAGE_SIZE + idx;
                const isBusy = busyId === item.id;

                return (
                  <article key={item.id} className="p-4 space-y-3 min-w-0">
                    <div className="flex items-start gap-3 min-w-0">
                      <CoverThumbnail item={item} index={globalIdx} />
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge
                            tone={item.category === "Event" ? "info" : "teal"}
                            className="rounded-[5px]"
                          >
                            {item.category}
                          </Badge>
                          <Badge
                            tone={
                              item.status === "Published" ? "success" : "warning"
                            }
                            className="rounded-[5px]"
                          >
                            {item.status}
                          </Badge>
                          {item.showOnHome ? (
                            <Badge tone="info" className="rounded-[5px]">
                              On Home
                            </Badge>
                          ) : null}
                        </div>
                        <h3 className="text-base font-medium text-[#1C1B1F] break-words">
                          {item.title}
                        </h3>
                        <p className="text-xs text-[#4A5565] break-words">
                          {item.marker}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs sm:text-sm text-[#4A5565] min-w-0">
                      <p className="flex items-center gap-1.5 font-mono text-[#1C1B1F] break-words">
                        <Calendar
                          className="w-3.5 h-3.5 shrink-0 text-[#0038E1]"
                          aria-hidden="true"
                        />
                        <span>{item.dateLabel}</span>
                      </p>
                      <p className="flex items-center gap-1.5 break-words">
                        <MapPin
                          className="w-3.5 h-3.5 shrink-0 text-[#0038E1]"
                          aria-hidden="true"
                        />
                        <span>{item.location}</span>
                      </p>
                    </div>

                    <div className="pt-2 border-t border-[#E2E8F0] flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        aria-label={`Edit ${item.title}`}
                        onClick={() => openEditModal(item)}
                        className="rounded-[5px] border-[#A1A7B4] text-[#0038E1]"
                      >
                        <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                        Edit
                      </Button>

                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={isBusy}
                        aria-pressed={item.showOnHome}
                        aria-label={`Toggle Show on Home for ${item.title}`}
                        onClick={() => void handleToggleShowOnHome(item)}
                        className="rounded-[5px] border-[#A1A7B4]"
                      >
                        <Globe className="w-3.5 h-3.5" aria-hidden="true" />
                        {item.showOnHome ? "On Home" : "Hidden"}
                      </Button>

                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={isBusy}
                        aria-label={`${
                          item.status === "Published" ? "Unpublish" : "Publish"
                        } ${item.title}`}
                        onClick={() => void handleToggleStatus(item)}
                        className="rounded-[5px] border-[#A1A7B4]"
                      >
                        {item.status === "Published" ? "Unpublish" : "Publish"}
                      </Button>

                      <button
                        type="button"
                        aria-label={`Delete ${item.title}`}
                        onClick={() => setDeleteTarget(item)}
                        className="inline-flex items-center gap-1 h-9 px-2.5 text-sm font-medium text-[#B41B00] hover:bg-[#FAAF98]/30 rounded-[5px] transition-colors cursor-pointer ml-auto"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        Delete
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}

        {/* Table Footer / Pagination */}
        {filteredEvents.length > 0 ? (
          <div className="px-5 sm:px-6 py-4 border-t border-[#E2E8F0]">
            {totalPages > 1 ? (
              <Pagination
                currentPage={safePage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={filteredEvents.length}
                pageSize={PAGE_SIZE}
              />
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-[#4A5565]">
                <p>
                  Showing {filteredEvents.length} item
                  {filteredEvents.length === 1 ? "" : "s"}
                </p>
                <p className="font-mono text-[#0038E1]">
                  1–{filteredEvents.length} of {filteredEvents.length}
                </p>
              </div>
            )}
          </div>
        ) : null}
      </div>

      <p className="text-sm text-[#4A5565]">
        Drafts are only visible to admins. Published items with Show on Home
        enabled appear on the website.
      </p>

      {/* Create / Edit Event Modal */}
      <EventEditorModal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        editingEvent={editingEvent}
        defaultOrder={nextOrder}
        onSaved={(saved, mode) => {
          setNotice({
            tone: "success",
            message:
              mode === "create"
                ? `Created "${saved.title}" (${saved.status}).`
                : `Updated "${saved.title}" (${saved.status}).`,
          });
        }}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteTarget !== null}
        onClose={() => {
          if (!deleting) setDeleteTarget(null);
        }}
        title="Delete Event / News"
        subtitle="Are you sure you want to remove this item from the roadmap?"
        maxWidthClass="max-w-md"
        footer={
          <div className="flex flex-wrap justify-end gap-2.5">
            <Button
              type="button"
              variant="secondary"
              disabled={deleting}
              onClick={() => setDeleteTarget(null)}
              className="rounded-[5px] border-[#A1A7B4] text-[#0038E1]"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              loading={deleting}
              onClick={() => void handleConfirmDelete()}
              className="rounded-[5px]"
            >
              Confirm Delete
            </Button>
          </div>
        }
      >
        {deleteTarget ? (
          <div className="space-y-2 text-sm text-[#4A5565]">
            <p className="text-base font-medium text-[#1C1B1F]">
              {deleteTarget.title}
            </p>
            <p>
              This permanently removes the event entry. Any cover image stored
              in Media &amp; Assets will remain available in the Media Library.
            </p>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
