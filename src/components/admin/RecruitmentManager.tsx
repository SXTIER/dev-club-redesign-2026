"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  Download,
  FileText,
  Search,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { useAppData } from "@/context/AppDataContext";
import { ApiError } from "@/lib/services/contracts";
import type {
  ApplicationStatus,
  RecruitmentApplication,
} from "@/lib/types/recruitment";
import { downloadApplicationsCsv } from "@/lib/utils/csvExport";
import {
  getApplicationStatusTone,
  ViewApplicationModal,
} from "./ViewApplicationModal";

type StatusFilterKey = "all" | ApplicationStatus;

const PAGE_SIZE = 10;

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

function formatTeamLabel(team: RecruitmentApplication["team"]): string {
  return team === "projects" ? "Projects Team" : "Marketing Team";
}

export function RecruitmentManager() {
  const { applications, recruitment, services } = useAppData();

  const [statusFilter, setStatusFilter] = useState<StatusFilterKey>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [viewingAppId, setViewingAppId] = useState<string | null>(null);
  const [togglingOpen, setTogglingOpen] = useState(false);
  const [notice, setNotice] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

  const counts = useMemo(() => {
    let pending = 0;
    let accepted = 0;
    let rejected = 0;
    let withCv = 0;
    let acceptedProjects = 0;
    let acceptedMarketing = 0;

    for (const app of applications) {
      if (app.status === "Pending") {
        pending += 1;
      } else if (app.status === "Accepted") {
        accepted += 1;
        if (app.team === "projects") acceptedProjects += 1;
        else acceptedMarketing += 1;
      } else {
        rejected += 1;
      }

      if (app.cv) withCv += 1;
    }

    const total = applications.length;
    const reviewed = accepted + rejected;
    const reviewedPercent = total === 0 ? 0 : Math.round((reviewed / total) * 100);

    return {
      total,
      pending,
      accepted,
      rejected,
      withCv,
      acceptedProjects,
      acceptedMarketing,
      reviewedPercent,
    };
  }, [applications]);

  const roleOptions = useMemo(() => {
    const seen = new Set<string>();
    const ordered: string[] = [];

    for (const role of recruitment.projectsTeamRoles) {
      const title = role.title.trim();
      if (title && !seen.has(title)) {
        seen.add(title);
        ordered.push(title);
      }
    }

    for (const role of recruitment.marketingTeamRoles) {
      const title = role.title.trim();
      if (title && !seen.has(title)) {
        seen.add(title);
        ordered.push(title);
      }
    }

    const extraRoleLabels: string[] = [];
    for (const app of applications) {
      const label = app.roleLabel.trim();
      if (label && !seen.has(label)) {
        seen.add(label);
        extraRoleLabels.push(label);
      }
    }
    extraRoleLabels.sort((a, b) => a.localeCompare(b));

    return [...ordered, ...extraRoleLabels];
  }, [
    recruitment.projectsTeamRoles,
    recruitment.marketingTeamRoles,
    applications,
  ]);

  const activeRoleFilter =
    roleFilter === "all" || roleOptions.includes(roleFilter)
      ? roleFilter
      : "all";

  const filteredApplications = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return applications.filter((app) => {
      if (statusFilter !== "all" && app.status !== statusFilter) {
        return false;
      }
      if (activeRoleFilter !== "all" && app.roleLabel !== activeRoleFilter) {
        return false;
      }
      if (!q) return true;

      const fullName =
        `${app.personal.firstName} ${app.personal.lastName}`.toLowerCase();
      return (
        fullName.includes(q) ||
        app.personal.nickname.toLowerCase().includes(q) ||
        app.personal.studentId.toLowerCase().includes(q) ||
        app.personal.email.toLowerCase().includes(q) ||
        app.roleLabel.toLowerCase().includes(q) ||
        (app.customRole?.toLowerCase().includes(q) ?? false) ||
        app.id.toLowerCase().includes(q)
      );
    });
  }, [applications, statusFilter, activeRoleFilter, searchQuery]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredApplications.length / PAGE_SIZE),
  );
  const safePage = Math.min(currentPage, totalPages);

  const pagedApplications = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredApplications.slice(start, start + PAGE_SIZE);
  }, [filteredApplications, safePage]);

  const viewingApplication = useMemo(
    () => applications.find((app) => app.id === viewingAppId) ?? null,
    [applications, viewingAppId],
  );

  const handleToggleRecruitmentOpen = async () => {
    if (togglingOpen) return;
    const nextOpen = !recruitment.isOpen;
    setTogglingOpen(true);
    setNotice(null);
    try {
      await services.content.updateSection("recruitment", {
        ...recruitment,
        isOpen: nextOpen,
      });
      setNotice({
        tone: "success",
        message: nextOpen
          ? "Recruitment is now Open — /joining-information is accepting student applications."
          : "Recruitment is now Closed — /joining-information now shows the closed notice.",
      });
    } catch (err) {
      setNotice({
        tone: "error",
        message:
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Failed to update recruitment intake status.",
      });
    } finally {
      setTogglingOpen(false);
    }
  };

  const handleExportCsv = () => {
    if (filteredApplications.length === 0) return;
    downloadApplicationsCsv(filteredApplications);
    setNotice({
      tone: "success",
      message: `Exported ${filteredApplications.length} application${
        filteredApplications.length === 1 ? "" : "s"
      } to CSV.`,
    });
  };

  const statusPills: Array<{
    key: StatusFilterKey;
    label: string;
    count: number;
  }> = [
    { key: "all", label: "All", count: counts.total },
    { key: "Pending", label: "Pending", count: counts.pending },
    { key: "Accepted", label: "Accepted", count: counts.accepted },
    { key: "Rejected", label: "Rejected", count: counts.rejected },
  ];

  return (
    <div className="space-y-6">
      {/* Live Recruitment Open / Closed Switch Card */}
      <section
        aria-label="Recruitment intake status"
        className="bg-white border border-[#A1A7B4] rounded-[16px] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-base sm:text-lg font-medium text-[#1C1B1F]">
              Recruitment Intake Status
            </h2>
            <Badge
              tone={recruitment.isOpen ? "success" : "danger"}
              className="rounded-[5px]"
            >
              {recruitment.isOpen ? "Open" : "Closed"}
            </Badge>
          </div>
          <p className="text-sm text-[#4A5565]">
            {recruitment.isOpen
              ? "Public /joining-information is currently accepting applications."
              : "Public /joining-information currently shows the closed recruitment notice."}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="text-sm font-medium text-[#4A5565]">
            {recruitment.isOpen ? "Open" : "Closed"}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={recruitment.isOpen}
            aria-label="Toggle Recruitment Open or Closed"
            disabled={togglingOpen}
            onClick={() => void handleToggleRecruitmentOpen()}
            className={[
              "relative inline-flex h-11 w-[68px] shrink-0 items-center rounded-full border-2 transition-colors cursor-pointer disabled:opacity-50",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0038E1]",
              recruitment.isOpen
                ? "bg-[#0038E1] border-[#001C26]"
                : "bg-[#E2E8F0] border-[#A1A7B4]",
            ].join(" ")}
          >
            <span
              className={[
                "inline-block h-8 w-8 rounded-full bg-white shadow transition-transform",
                recruitment.isOpen ? "translate-x-7" : "translate-x-0.5",
              ].join(" ")}
            />
          </button>
        </div>
      </section>

      {/* 4-Column Live KPI Cards */}
      <section
        aria-label="Recruitment metrics"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5"
      >
        <div
          data-testid="kpi-total"
          className="bg-white border border-[#A1A7B4] rounded-[16px] p-4 sm:p-6 flex flex-col justify-between gap-2.5"
        >
          <p className="text-base sm:text-lg font-medium text-[#1C1B1F]">
            Total Submitted
          </p>
          <p className="text-3xl sm:text-[44px] font-medium leading-none text-[#1C1B1F]">
            {counts.total}
          </p>
          <p className="text-xs sm:text-sm text-[#4A5565]">
            {counts.withCv} with CV attached
          </p>
        </div>

        <div
          data-testid="kpi-pending"
          className="bg-white border border-[#A1A7B4] rounded-[16px] p-4 sm:p-6 flex flex-col justify-between gap-2.5"
        >
          <p className="text-base sm:text-lg font-medium text-[#1C1B1F]">
            Pending / Unchecked
          </p>
          <p className="text-3xl sm:text-[44px] font-medium leading-none text-[#1C1B1F]">
            {counts.pending}
          </p>
          <p className="text-xs sm:text-sm text-[#4A5565]">
            {counts.reviewedPercent}% of applications reviewed
          </p>
        </div>

        <div
          data-testid="kpi-accepted"
          className="bg-white border border-[#A1A7B4] rounded-[16px] p-4 sm:p-6 flex flex-col justify-between gap-2.5"
        >
          <p className="text-base sm:text-lg font-medium text-[#1C1B1F]">
            Accepted
          </p>
          <p className="text-3xl sm:text-[44px] font-medium leading-none text-[#1C1B1F]">
            {counts.accepted}
          </p>
          <p className="text-xs sm:text-sm text-[#4A5565]">
            {counts.acceptedProjects} Projects · {counts.acceptedMarketing} Marketing
          </p>
        </div>

        <div
          data-testid="kpi-rejected"
          className="bg-white border border-[#A1A7B4] rounded-[16px] p-4 sm:p-6 flex flex-col justify-between gap-2.5"
        >
          <p className="text-base sm:text-lg font-medium text-[#1C1B1F]">
            Rejected
          </p>
          <p className="text-3xl sm:text-[44px] font-medium leading-none text-[#1C1B1F]">
            {counts.rejected}
          </p>
          <p className="text-xs sm:text-sm text-[#4A5565]">
            Not selected for intake
          </p>
        </div>
      </section>

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
            <AlertCircle
              className="w-5 h-5 shrink-0 mt-0.5"
              aria-hidden="true"
            />
          ) : (
            <Check className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
          )}
          <span>{notice.message}</span>
        </div>
      ) : null}

      {/* Filter Bar: Status Pills + Dynamic Role Select + Search + Export CSV */}
      <div className="space-y-3">
        <div className="flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-3">
          <select
            aria-label="Filter applications by status"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as StatusFilterKey);
              setCurrentPage(1);
            }}
            className="sm:hidden w-full min-w-0 h-11 px-3 rounded-[5px] border border-[#A1A7B4] bg-white text-base font-medium text-[#0038E1] focus:outline-2 focus:outline-[#0038E1]"
          >
            {statusPills.map((pill) => (
              <option key={pill.key} value={pill.key}>
                {pill.label} ({pill.count})
              </option>
            ))}
          </select>
          <div
            role="group"
            aria-label="Filter applications by status"
            className="hidden sm:flex flex-wrap items-center gap-2"
          >
            {statusPills.map((pill) => {
              const active = statusFilter === pill.key;
              return (
                <button
                  key={pill.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setStatusFilter(pill.key);
                    setCurrentPage(1);
                  }}
                  className={[
                    "h-11 px-3.5 rounded-[5px] text-sm transition-colors cursor-pointer whitespace-nowrap",
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

          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">
            <div className="relative min-w-0 flex-1 sm:basis-64">
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
                aria-label="Search applications"
                placeholder="Search name, nickname, ID, email, or role..."
                className="w-full h-11 pl-10 pr-3.5 rounded-[5px] border border-[#A1A7B4] bg-white text-sm text-[#1C1B1F] placeholder:text-[#4A5565] focus:outline-none focus:border-[#0038E1]"
              />
            </div>

            <select
              aria-label="Filter by position or role"
              value={activeRoleFilter}
              onChange={(event) => {
                setRoleFilter(event.target.value);
                setCurrentPage(1);
              }}
              className="h-11 min-w-0 w-full sm:w-auto sm:max-w-72 px-3.5 rounded-[5px] border border-[#A1A7B4] bg-white text-sm text-[#0038E1] font-medium focus:outline-none focus:border-[#0038E1] cursor-pointer"
            >
              <option value="all">Position: All positions</option>
              {roleOptions.map((roleTitle) => (
                <option key={roleTitle} value={roleTitle}>
                  {roleTitle}
                </option>
              ))}
            </select>

            <Button
              type="button"
              variant="secondary"
              disabled={filteredApplications.length === 0}
              onClick={handleExportCsv}
              className="rounded-[5px] border-[#A1A7B4] text-[#0038E1]"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              Export CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Applications Table (Desktop >= 1280px) & Stacked Cards (Mobile < 1280px) */}
      <div className="bg-white border border-[#A1A7B4] rounded-[16px] overflow-hidden">
        <div className="px-5 sm:px-6 py-4 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-lg sm:text-[22px] font-medium text-[#1C1B1F]">
            Applications Checklist
          </h2>
          <p className="text-sm text-[#4A5565]">
            {filteredApplications.length} matching · {applications.length} total
          </p>
        </div>

        {pagedApplications.length === 0 ? (
          <div className="px-6 py-12 text-center space-y-2">
            <p className="text-base font-medium text-[#1C1B1F]">
              No matching recruitment applications found.
            </p>
            <p className="text-sm text-[#4A5565]">
              Try clearing your search, choosing All positions, or switching
              status filters above.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table (>= 1280px) */}
            <div
              data-testid="recruitment-desktop-table"
              className="hidden xl:block min-w-0 overflow-x-auto"
            >
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-[13px] font-medium text-[#4A5565]">
                    <th scope="col" className="py-3.5 pl-6 pr-3">
                      Student ID
                    </th>
                    <th scope="col" className="py-3.5 px-3">
                      Applicant
                    </th>
                    <th scope="col" className="py-3.5 px-3">
                      Role &amp; Team
                    </th>
                    <th scope="col" className="py-3.5 px-3">
                      CV
                    </th>
                    <th scope="col" className="py-3.5 px-3">
                      Submitted
                    </th>
                    <th scope="col" className="py-3.5 px-3">
                      Status
                    </th>
                    <th scope="col" className="py-3.5 pl-3 pr-6 text-right">
                      Application
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#A1A7B4]/60">
                  {pagedApplications.map((app) => (
                    <tr
                      key={app.id}
                      className="hover:bg-[#F8FAFC] transition-colors"
                    >
                      <td className="py-3.5 pl-6 pr-3 align-middle">
                        <span className="font-mono text-sm text-[#1C1B1F]">
                          {app.personal.studentId}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 align-middle min-w-[210px]">
                        <p className="text-base font-medium text-[#1C1B1F]">
                          {app.personal.firstName} {app.personal.lastName}
                        </p>
                        <p className="mt-0.5 text-xs text-[#4A5565]">
                          &ldquo;{app.personal.nickname}&rdquo; ·{" "}
                          {app.personal.program} Year {app.personal.year}
                        </p>
                      </td>

                      <td className="py-3.5 px-3 align-middle">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge tone="neutral" className="rounded-[5px]">
                            {app.roleLabel}
                          </Badge>
                          {app.customRole ? (
                            <Badge tone="info" className="rounded-[5px]">
                              {app.customRole}
                            </Badge>
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs text-[#757E91]">
                          {formatTeamLabel(app.team)}
                        </p>
                      </td>

                      <td className="py-3.5 px-3 align-middle">
                        {app.cv ? (
                          <span
                            title={app.cv.filename}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#006C6C] bg-[#BDFBCC]/50 border border-[#41E0A8]/60 rounded-[5px] px-2.5 py-1 whitespace-nowrap"
                          >
                            <FileText
                              className="w-3.5 h-3.5 shrink-0"
                              aria-hidden="true"
                            />
                            <span>CV attached</span>
                          </span>
                        ) : (
                          <span className="text-xs text-[#757E91] whitespace-nowrap">
                            No CV
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 align-middle">
                        <span className="text-sm text-[#4A5565] whitespace-nowrap">
                          {formatShortDate(app.createdAt)}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 align-middle">
                        <Badge
                          tone={getApplicationStatusTone(app.status)}
                          className="rounded-[5px]"
                        >
                          {app.status}
                        </Badge>
                      </td>

                      <td className="py-3.5 pl-3 pr-6 align-middle text-right">
                        <button
                          type="button"
                          onClick={() => setViewingAppId(app.id)}
                          className="text-sm sm:text-base font-medium text-[#0038E1] hover:text-[#002BAA] hover:underline underline-offset-4 cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0038E1]"
                        >
                          View Form →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile & Tablet Stacked Cards (< 1280px) */}
            <div
              data-testid="recruitment-mobile-cards"
              className="xl:hidden divide-y divide-[#E2E8F0]"
            >
              {pagedApplications.map((app) => (
                <article key={app.id} className="p-4 space-y-3 min-w-0">
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <div className="min-w-0 space-y-0.5">
                      <h3 className="text-base font-medium text-[#1C1B1F] break-words">
                        {app.personal.firstName} {app.personal.lastName}
                      </h3>
                      <p className="text-xs text-[#4A5565] break-words">
                        <span className="font-mono">
                          {app.personal.studentId}
                        </span>{" "}
                        · &ldquo;{app.personal.nickname}&rdquo; ·{" "}
                        {app.personal.program} Year {app.personal.year}
                      </p>
                    </div>

                    <Badge
                      tone={getApplicationStatusTone(app.status)}
                      className="rounded-[5px] shrink-0"
                    >
                      {app.status}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                    <Badge tone="neutral" className="rounded-[5px] max-w-full whitespace-normal [overflow-wrap:anywhere]">
                      {app.roleLabel}
                    </Badge>
                    {app.customRole ? (
                      <Badge tone="info" className="rounded-[5px] max-w-full whitespace-normal [overflow-wrap:anywhere]">
                        {app.customRole}
                      </Badge>
                    ) : null}
                    <span className="text-xs text-[#757E91]">
                      {formatTeamLabel(app.team)}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#4A5565]">
                      <span>{formatShortDate(app.createdAt)}</span>
                      <span>·</span>
                      {app.cv ? (
                        <span className="inline-flex items-center gap-1 font-medium text-[#006C6C]">
                          <FileText
                            className="w-3.5 h-3.5 shrink-0"
                            aria-hidden="true"
                          />
                          <span>CV attached</span>
                        </span>
                      ) : (
                        <span className="text-[#757E91]">No CV</span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setViewingAppId(app.id)}
                      className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-[#0038E1] hover:text-[#002BAA] hover:underline underline-offset-4 cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-[#0038E1]"
                    >
                      View Form →
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}

        {/* Table Footer / Pagination */}
        {filteredApplications.length > 0 ? (
          <div className="px-5 sm:px-6 py-4 border-t border-[#E2E8F0]">
            {totalPages > 1 ? (
              <Pagination
                currentPage={safePage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={filteredApplications.length}
                pageSize={PAGE_SIZE}
              />
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-[#4A5565]">
                <p>
                  Showing 1–{filteredApplications.length} of{" "}
                  {filteredApplications.length} applicant
                  {filteredApplications.length === 1 ? "" : "s"}
                </p>
                <p className="text-xs text-[#757E91]">
                  Click View Form → to review details, CVs, and decision status.
                </p>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* View Form Modal */}
      <ViewApplicationModal
        application={viewingApplication}
        open={viewingApplication !== null}
        onClose={() => setViewingAppId(null)}
        onStatusUpdated={(updated) => {
          setNotice({
            tone: "success",
            message: `Updated ${updated.personal.firstName} ${updated.personal.lastName} (${updated.id}) to ${updated.status}.`,
          });
        }}
      />
    </div>
  );
}
