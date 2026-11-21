"use client";

import Link from "next/link";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { useAppData } from "@/context/AppDataContext";
import type { InquiryStatus } from "@/lib/types/inquiries";
import type { ApplicationStatus } from "@/lib/types/recruitment";

function formatShortDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getApplicationBadgeTone(status: ApplicationStatus): BadgeTone {
  if (status === "Accepted") return "success";
  if (status === "Rejected") return "danger";
  return "warning";
}

function getInquiryBadgeTone(status: InquiryStatus): BadgeTone {
  return status === "Answered" ? "teal" : "warning";
}

export function OverviewDashboard() {
  const { applications, events, inquiries, recruitment, mode } = useAppData();

  const pendingApplications = applications.filter(
    (app) => app.status === "Pending",
  ).length;
  const acceptedApplications = applications.filter(
    (app) => app.status === "Accepted",
  ).length;
  const totalApplications = applications.length;

  const publishedEvents = events.filter(
    (evt) => evt.status === "Published",
  ).length;
  const homeEvents = events.filter((evt) => evt.showOnHome).length;
  const totalEvents = events.length;
  const nextPublishedEvent = events.find((evt) => evt.status === "Published");

  const unreadInquiries = inquiries.filter(
    (inq) => inq.status === "Unanswered",
  ).length;
  const answeredInquiries = inquiries.filter(
    (inq) => inq.status === "Answered",
  ).length;
  const totalInquiries = inquiries.length;

  const latestApplications = [...applications]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);

  const latestInquiries = [...inquiries]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Dashboard Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5 mb-2">
            {mode === "mock" ? (
              <Badge tone="info" className="rounded-full">
                Preview / Mock Mode
              </Badge>
            ) : null}
            <Badge
              tone={recruitment.isOpen ? "success" : "danger"}
              className="rounded-full"
            >
              Recruitment Status: {recruitment.isOpen ? "Open" : "Closed"}
            </Badge>
          </div>

          <h1 className="text-2xl sm:text-[30px] font-medium text-[#1C1B1F] leading-tight">
            Club Overview &amp; Statistics
          </h1>
          <p className="mt-1 text-base sm:text-lg text-[#4A5565]">
            5 teams · Event Roadmap · Recruitment · Inquiries
          </p>
        </div>

        <Link
          href="/admin/events"
          className="inline-flex items-center text-base sm:text-lg font-medium text-[#4A5565] hover:text-[#0038E1] transition-colors self-start lg:self-auto"
        >
          + Add Event
        </Link>
      </div>

      {/* 3-Column Live KPI Cards */}
      <section
        aria-label="Key metrics"
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        {/* Recruitment KPI */}
        <div
          data-testid="kpi-recruitment"
          className="bg-[#FFFFFF] border border-[#A1A7B4] rounded-[16px] p-6 sm:p-7 flex flex-col justify-between"
        >
          <div>
            <h2 className="text-xl sm:text-[23px] font-medium text-[#1C1B1F]">
              Recruitment
            </h2>
            <div className="mt-5 flex items-baseline gap-3">
              <span className="text-5xl sm:text-[56px] font-medium leading-none text-[#1C1B1F]">
                {pendingApplications}
              </span>
              <span className="text-lg sm:text-[22px] font-medium text-[#1C1B1F]">
                Unchecked
              </span>
            </div>
          </div>

          <div>
            <hr className="my-5 border-[#E2E8F0]" />
            <div className="flex flex-wrap items-center justify-between gap-2 text-base sm:text-lg font-medium text-[#1C1B1F]">
              <span>{acceptedApplications} accepted</span>
              <span className="text-[#4A5565]">
                {totalApplications} total submitted
              </span>
            </div>
            <Link
              href="/admin/recruitment"
              className="mt-5 inline-flex items-center text-base sm:text-lg font-normal text-[#0038E1] hover:text-[#002BAA] hover:underline underline-offset-4"
            >
              Review recruitment →
            </Link>
          </div>
        </div>

        {/* Events & News KPI */}
        <div
          data-testid="kpi-events"
          className="bg-[#FFFFFF] border border-[#A1A7B4] rounded-[16px] p-6 sm:p-7 flex flex-col justify-between"
        >
          <div>
            <h2 className="text-xl sm:text-[23px] font-medium text-[#1C1B1F]">
              Events &amp; News
            </h2>
            <div className="mt-5 flex items-baseline gap-3">
              <span className="text-5xl sm:text-[56px] font-medium leading-none text-[#1C1B1F]">
                {publishedEvents}
              </span>
              <span className="text-lg sm:text-[22px] font-medium text-[#1C1B1F]">
                published events
              </span>
            </div>
          </div>

          <div>
            <hr className="my-5 border-[#E2E8F0]" />
            <div className="flex flex-wrap items-center justify-between gap-2 text-base font-medium text-[#1C1B1F]">
              <span>{homeEvents} events on Home</span>
              <span className="text-[#4A5565]">{totalEvents} total events</span>
            </div>
            {nextPublishedEvent ? (
              <p className="mt-1.5 text-sm text-[#757E91] truncate">
                Next: {nextPublishedEvent.title}
              </p>
            ) : null}
            <Link
              href="/admin/events"
              className="mt-4 inline-flex items-center text-base sm:text-lg font-normal text-[#0038E1] hover:text-[#002BAA] hover:underline underline-offset-4"
            >
              View roadmap →
            </Link>
          </div>
        </div>

        {/* Questions / Inquiries KPI */}
        <div
          data-testid="kpi-inquiries"
          className="bg-[#FFFFFF] border border-[#A1A7B4] rounded-[16px] p-6 sm:p-7 flex flex-col justify-between"
        >
          <div>
            <h2 className="text-xl sm:text-[23px] font-medium text-[#1C1B1F]">
              Questions
            </h2>
            <div className="mt-5 flex items-baseline gap-3">
              <span className="text-5xl sm:text-[56px] font-medium leading-none text-[#1C1B1F]">
                {unreadInquiries}
              </span>
              <span className="text-lg sm:text-[22px] font-medium text-[#757E91]">
                Unread Inquiries
              </span>
            </div>
          </div>

          <div>
            <hr className="my-5 border-[#E2E8F0]" />
            <div className="flex flex-wrap items-center justify-between gap-2 text-base sm:text-lg font-medium text-[#1C1B1F]">
              <span>{`${answeredInquiries} answered`}</span>
              <span className="text-[#4A5565]">
                {`${totalInquiries} total inquiries`}
              </span>
            </div>
            <Link
              href="/admin/inquiries"
              className="mt-5 inline-flex items-center text-base sm:text-lg font-normal text-[#0038E1] hover:text-[#002BAA] hover:underline underline-offset-4"
            >
              Review inquiries →
            </Link>
          </div>
        </div>
      </section>

      {/* 2-Column Latest Lists */}
      <section
        aria-label="Latest activity"
        className="grid grid-cols-1 xl:grid-cols-2 gap-6"
      >
        {/* Latest Recruitment */}
        <div
          data-testid="latest-recruitment"
          className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-[16px] overflow-hidden"
        >
          <div className="px-6 py-5 border-b border-[#E2E8F0] flex items-center justify-between gap-4">
            <h2 className="text-xl sm:text-[23px] font-medium text-[#1C1B1F]">
              Latest Recruitment
            </h2>
            <Link
              href="/admin/recruitment"
              className="text-base font-normal text-[#0038E1] hover:text-[#002BAA] hover:underline underline-offset-4 shrink-0"
            >
              View all ({totalApplications}) →
            </Link>
          </div>

          {latestApplications.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-[#757E91]">
              No recruitment applications submitted yet.
            </div>
          ) : (
            <ul className="divide-y divide-[#E2E8F0]">
              {latestApplications.map((app) => (
                <li
                  key={app.id}
                  className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start sm:items-center gap-4 min-w-0">
                    <span className="font-mono text-sm text-[#757E91] shrink-0">
                      {app.personal.studentId}
                    </span>
                    <div className="min-w-0">
                      <p className="text-base font-medium text-[#1C1B1F] truncate">
                        {app.personal.firstName} {app.personal.lastName}
                      </p>
                      <p className="text-sm text-[#757E91]">
                        {app.personal.program} Year {app.personal.year}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 sm:justify-end">
                    <Badge tone="danger" className="rounded-[5px]">
                      {app.customRole || app.roleLabel}
                    </Badge>
                    <Badge
                      tone={getApplicationBadgeTone(app.status)}
                      className="rounded-[5px]"
                    >
                      {app.status}
                    </Badge>
                    <span className="text-xs sm:text-sm text-[#4A5565] whitespace-nowrap">
                      {formatShortDate(app.createdAt)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Latest Questions */}
        <div
          data-testid="latest-questions"
          className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-[16px] overflow-hidden"
        >
          <div className="px-6 py-5 border-b border-[#E2E8F0] flex items-center justify-between gap-4">
            <h2 className="text-xl sm:text-[23px] font-medium text-[#1C1B1F]">
              Latest Questions
            </h2>
            <Link
              href="/admin/inquiries"
              className="text-base font-normal text-[#0038E1] hover:text-[#002BAA] hover:underline underline-offset-4 shrink-0"
            >
              View all ({totalInquiries}) →
            </Link>
          </div>

          {latestInquiries.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-[#757E91]">
              No inquiries received yet.
            </div>
          ) : (
            <ul className="divide-y divide-[#E2E8F0]">
              {latestInquiries.map((inq) => (
                <li
                  key={inq.id}
                  className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-medium text-[#1C1B1F] line-clamp-2">
                      {inq.question}
                    </p>
                    <p className="mt-1 text-sm text-[#757E91] truncate">
                      {inq.senderEmail} · {formatShortDate(inq.createdAt)}
                    </p>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                    <Badge
                      tone={getInquiryBadgeTone(inq.status)}
                      className="rounded-[8px]"
                    >
                      {inq.status}
                    </Badge>
                    <Link
                      href="/admin/inquiries"
                      className="text-sm text-[#0038E1] hover:text-[#002BAA] underline underline-offset-4 whitespace-nowrap"
                    >
                      Reply via email →
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
