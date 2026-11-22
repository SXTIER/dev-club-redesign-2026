"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  ExternalLink,
  FileText,
  Loader2,
} from "lucide-react";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useAppData } from "@/context/AppDataContext";
import { ApiError } from "@/lib/services/contracts";
import type {
  ApplicationStatus,
  RecruitmentApplication,
} from "@/lib/types/recruitment";

export interface ViewApplicationModalProps {
  application: RecruitmentApplication | null;
  open: boolean;
  onClose: () => void;
  onStatusUpdated?: (updated: RecruitmentApplication) => void;
}

const APPLICATION_STATUSES: readonly ApplicationStatus[] = [
  "Pending",
  "Accepted",
  "Rejected",
];

export function getApplicationStatusTone(status: ApplicationStatus): BadgeTone {
  if (status === "Accepted") return "success";
  if (status === "Rejected") return "danger";
  return "warning";
}

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getSafeHttpUrl(raw?: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

function isSafeDownloadUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("/")) return true;
  return (
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("http://")
  );
}

function getDecisionButtonClasses(
  status: ApplicationStatus,
  isActive: boolean,
): string {
  if (!isActive) {
    return "bg-white border border-[#A1A7B4] text-[#4A5565] hover:bg-[#F4F5F7] hover:text-[#1C1B1F]";
  }
  if (status === "Accepted") {
    return "bg-[#E7FDA7] border-2 border-[#548000] text-[#548000] font-semibold";
  }
  if (status === "Rejected") {
    return "bg-[#FAAF98] border-2 border-[#B41B00] text-[#B41B00] font-semibold";
  }
  return "bg-[#FFF194] border-2 border-[#AA5000] text-[#AA5000] font-semibold";
}

function triggerAnchorDownload(url: string, filename: string): void {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener noreferrer";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

function DetailField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0 space-y-1">
      <p className="text-xs sm:text-sm font-normal text-[#4A5565]">{label}</p>
      <p
        className={[
          "text-sm sm:text-base font-medium text-[#1C1B1F] break-words",
          mono ? "font-mono" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {value}
      </p>
    </div>
  );
}

function MotivationBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[10px] border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-1.5">
      <p className="text-xs sm:text-sm font-medium text-[#4A5565]">{label}</p>
      <p className="text-sm sm:text-base text-[#1C1B1F] leading-relaxed whitespace-pre-line break-words">
        {value}
      </p>
    </div>
  );
}

export function ViewApplicationModal({
  application,
  open,
  onClose,
  onStatusUpdated,
}: ViewApplicationModalProps) {
  const { services } = useAppData();
  const [updatingStatus, setUpdatingStatus] =
    useState<ApplicationStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [loadingCv, setLoadingCv] = useState(false);
  const [cvError, setCvError] = useState<string | null>(null);

  useEffect(() => {
    setStatusError(null);
    setCvError(null);
    setUpdatingStatus(null);
    setLoadingCv(false);
  }, [application?.id, open]);

  if (!application) {
    return null;
  }

  const fullName = `${application.personal.firstName} ${application.personal.lastName}`;
  const teamLabel =
    application.team === "projects" ? "Projects Team" : "Marketing Team";
  const safePortfolioUrl = getSafeHttpUrl(application.portfolioUrl);

  const handleStatusDecision = async (nextStatus: ApplicationStatus) => {
    if (updatingStatus) return;
    setStatusError(null);
    setUpdatingStatus(nextStatus);
    try {
      const updated = await services.recruitment.updateStatus(
        application.id,
        nextStatus,
      );
      onStatusUpdated?.(updated);
    } catch (err) {
      setStatusError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to update application status.",
      );
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleViewCv = async () => {
    if (!application.cv || loadingCv) return;
    setCvError(null);
    setLoadingCv(true);
    try {
      const info = await services.recruitment.getCvDownloadUrl(application.id);
      if (!info.url || !isSafeDownloadUrl(info.url)) {
        throw new Error("CV file URL is unavailable or invalid.");
      }

      const resolvedFilename = info.filename || application.cv.filename;
      const isPdf =
        info.mimeType.toLowerCase() === "application/pdf" ||
        resolvedFilename.toLowerCase().endsWith(".pdf");

      if (isPdf && typeof window !== "undefined") {
        const opened = window.open(info.url, "_blank", "noopener,noreferrer");
        if (!opened) {
          triggerAnchorDownload(info.url, resolvedFilename);
        }
      } else {
        triggerAnchorDownload(info.url, resolvedFilename);
      }
    } catch (err) {
      setCvError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Unable to load CV file.",
      );
    } finally {
      setLoadingCv(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Application Details"
      subtitle={`${application.id} · Submitted ${formatDateTime(application.createdAt)}`}
      maxWidthClass="max-w-3xl"
      footer={
        <div className="space-y-3">
          {statusError ? (
            <div
              role="alert"
              className="rounded-[8px] border border-[#FB4A2A] bg-[#FAAF98]/35 px-3.5 py-2.5 text-sm font-medium text-[#B41B00] flex items-start gap-2"
            >
              <AlertCircle
                className="w-4 h-4 shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <span>{statusError}</span>
            </div>
          ) : null}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-[#4A5565] mr-1">
                Review decision:
              </span>
              {APPLICATION_STATUSES.map((statusOption) => {
                const isActive = application.status === statusOption;
                const isBusy = updatingStatus === statusOption;
                return (
                  <button
                    key={statusOption}
                    type="button"
                    aria-pressed={isActive}
                    disabled={updatingStatus !== null}
                    onClick={() => void handleStatusDecision(statusOption)}
                    className={[
                      "inline-flex items-center justify-center gap-1.5 h-10 px-3.5 rounded-[6px] text-sm transition-colors cursor-pointer disabled:opacity-60",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0038E1]",
                      getDecisionButtonClasses(statusOption, isActive),
                    ].join(" ")}
                  >
                    {isBusy ? (
                      <Loader2
                        className="w-3.5 h-3.5 animate-spin"
                        aria-hidden="true"
                      />
                    ) : null}
                    <span>{statusOption}</span>
                  </button>
                );
              })}
            </div>

            <Button
              type="button"
              variant="primary"
              onClick={onClose}
              className="rounded-[6px] border-0 sm:min-w-[110px]"
            >
              Done
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-7">
        {/* Applicant Summary Header */}
        <div className="rounded-[12px] border border-[#E2E8F0] bg-[#F8FAFC] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <h3 className="text-xl sm:text-2xl font-medium text-[#1C1B1F] break-words">
              {fullName}
            </h3>
            <p className="text-sm text-[#4A5565] break-words">
              <span className="font-mono">{application.personal.studentId}</span>{" "}
              · {application.personal.program} Year {application.personal.year} ·{" "}
              <span className="font-mono">{application.id}</span>
            </p>
            <p className="text-xs text-[#757E91]">
              Submitted {formatDateTime(application.createdAt)}
            </p>
          </div>

          <Badge
            tone={getApplicationStatusTone(application.status)}
            className="rounded-[5px] self-start shrink-0 px-3 py-1.5 text-sm"
          >
            {application.status}
          </Badge>
        </div>

        {/* 01 · Personal & Student Information */}
        <section aria-labelledby="section-personal-heading" className="space-y-4">
          <h4
            id="section-personal-heading"
            className="text-base sm:text-lg font-medium text-[#0038E1] border-b border-[#E2E8F0] pb-2"
          >
            01 · Personal &amp; Student Information
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DetailField label="Full Name" value={fullName} />
            <DetailField
              label="Nickname"
              value={application.personal.nickname}
            />
            <DetailField
              label="Student ID (7 digits)"
              value={application.personal.studentId}
              mono
            />
            <DetailField label="Email" value={application.personal.email} />
            <DetailField
              label="Telephone Number (10 digits)"
              value={application.personal.phone}
              mono
            />
            <DetailField
              label="Program"
              value={application.personal.program}
            />
            <DetailField
              label="Year"
              value={`Year ${application.personal.year}`}
            />
          </div>
        </section>

        {/* 02 · Role & Focus */}
        <section aria-labelledby="section-role-heading" className="space-y-4">
          <h4
            id="section-role-heading"
            className="text-base sm:text-lg font-medium text-[#0038E1] border-b border-[#E2E8F0] pb-2"
          >
            02 · Role &amp; Focus
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DetailField label="Selected Team" value={teamLabel} />
            <DetailField label="Selected Role" value={application.roleLabel} />
            {application.customRole ? (
              <div className="sm:col-span-2">
                <DetailField
                  label="Custom Role Specified"
                  value={application.customRole}
                />
              </div>
            ) : null}
          </div>
        </section>

        {/* 03 · Motivation, Experience, Portfolio & CV */}
        <section
          aria-labelledby="section-motivation-heading"
          className="space-y-4"
        >
          <h4
            id="section-motivation-heading"
            className="text-base sm:text-lg font-medium text-[#0038E1] border-b border-[#E2E8F0] pb-2"
          >
            03 · Motivation, Experience, Portfolio &amp; CV
          </h4>

          <div className="space-y-3">
            <MotivationBlock
              label="Expectation"
              value={application.motivation.expectation}
            />
            <MotivationBlock
              label="Contribution"
              value={application.motivation.contribution}
            />
            <MotivationBlock
              label="Project Idea"
              value={application.motivation.projectIdea}
            />
            <MotivationBlock
              label="Team Project Experience"
              value={application.motivation.teamExperience}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* CV Attachment */}
            <div className="rounded-[10px] border border-[#E2E8F0] bg-white p-4 space-y-2 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-[#4A5565]">
                CV Attachment
              </p>
              {application.cv ? (
                <div className="space-y-2.5">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <FileText
                      className="w-4 h-4 text-[#0038E1] shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#1C1B1F] break-all">
                        {application.cv.filename}
                      </p>
                      <p className="text-xs text-[#757E91]">
                        {formatBytes(application.cv.sizeBytes)}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={loadingCv}
                    onClick={() => void handleViewCv()}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0038E1] hover:text-[#002BAA] underline underline-offset-4 cursor-pointer disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0038E1]"
                  >
                    {loadingCv ? (
                      <>
                        <Loader2
                          className="w-3.5 h-3.5 animate-spin"
                          aria-hidden="true"
                        />
                        <span>Loading CV...</span>
                      </>
                    ) : (
                      <span>View File →</span>
                    )}
                  </button>
                  {cvError ? (
                    <p
                      role="alert"
                      className="text-xs font-medium text-[#B41B00] bg-[#FAAF98]/30 border border-[#FB4A2A] rounded-[6px] px-2.5 py-2"
                    >
                      {cvError}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-[#757E91]">No CV file attached</p>
              )}
            </div>

            {/* Portfolio Link */}
            <div className="rounded-[10px] border border-[#E2E8F0] bg-white p-4 space-y-2 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-[#4A5565]">
                Portfolio Link
              </p>
              {safePortfolioUrl ? (
                <a
                  href={safePortfolioUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm sm:text-base font-medium text-[#0038E1] hover:text-[#002BAA] underline underline-offset-4 break-all"
                >
                  <span>{application.portfolioUrl}</span>
                  <ExternalLink
                    className="w-3.5 h-3.5 shrink-0"
                    aria-hidden="true"
                  />
                </a>
              ) : application.portfolioUrl ? (
                <div className="space-y-1">
                  <p className="text-sm text-[#1C1B1F] break-all">
                    {application.portfolioUrl}
                  </p>
                  <p className="text-xs text-[#757E91]">
                    External link disabled (requires http:// or https:// URL).
                  </p>
                </div>
              ) : (
                <p className="text-sm text-[#757E91]">Not provided</p>
              )}
            </div>
          </div>
        </section>

        {/* Agreements & Confirmation */}
        <section
          aria-labelledby="section-agreements-heading"
          className="space-y-3 border-t border-[#E2E8F0] pt-5"
        >
          <h4
            id="section-agreements-heading"
            className="text-base sm:text-lg font-medium text-[#0038E1]"
          >
            Agreements &amp; Confirmation
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="rounded-[8px] border border-[#E2E8F0] bg-[#F8FAFC] p-3">
              <p className="font-medium text-[#1C1B1F]">
                Requirements Agreement ·{" "}
                {application.agreedRequirements ? "Agreed" : "Not agreed"}
              </p>
            </div>
            <div className="rounded-[8px] border border-[#E2E8F0] bg-[#F8FAFC] p-3">
              <p className="font-medium text-[#1C1B1F]">
                Information Confirmation (PDPA) ·{" "}
                {application.agreedPdpa ? "Confirmed" : "Not confirmed"}
              </p>
            </div>
          </div>
        </section>
      </div>
    </Modal>
  );
}
