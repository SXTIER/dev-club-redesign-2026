"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  pageSize?: number;
  className?: string;
}

function getVisiblePages(
  currentPage: number,
  totalPages: number,
): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages: Array<number | "ellipsis"> = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) {
    pages.push("ellipsis");
  }
  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }
  if (end < totalPages - 1) {
    pages.push("ellipsis");
  }
  pages.push(totalPages);
  return pages;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
  className = "",
}: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const safeCurrent = Math.min(Math.max(1, currentPage), totalPages);
  const visiblePages = getVisiblePages(safeCurrent, totalPages);

  return (
    <nav
      aria-label="Pagination"
      className={[
        "flex flex-wrap items-center justify-between gap-3",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {typeof totalItems === "number" && typeof pageSize === "number" ? (
        <p className="text-xs text-gray">
          Showing{" "}
          <span className="font-medium text-ink">
            {totalItems === 0 ? 0 : (safeCurrent - 1) * pageSize + 1}
          </span>
          –
          <span className="font-medium text-ink">
            {Math.min(safeCurrent * pageSize, totalItems)}
          </span>{" "}
          of <span className="font-medium text-ink">{totalItems}</span>
        </p>
      ) : (
        <span className="text-xs text-gray">
          Page <span className="font-medium text-ink">{safeCurrent}</span> of{" "}
          <span className="font-medium text-ink">{totalPages}</span>
        </span>
      )}

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(safeCurrent - 1)}
          disabled={safeCurrent <= 1}
          aria-label="Previous page"
          className="inline-flex items-center justify-center h-9 px-2.5 border border-border bg-surface text-sm font-medium text-ink hover:bg-canvas-muted disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          <span className="sr-only sm:not-sr-only sm:ml-1">Previous</span>
        </button>

        {visiblePages.map((entry, index) =>
          entry === "ellipsis" ? (
            <span
              key={`ellipsis-${index}`}
              className="inline-flex items-center justify-center w-9 h-9 text-sm text-gray"
            >
              …
            </span>
          ) : (
            <button
              key={entry}
              type="button"
              onClick={() => onPageChange(entry)}
              aria-current={entry === safeCurrent ? "page" : undefined}
              className={[
                "inline-flex items-center justify-center w-9 h-9 text-sm font-medium transition-colors cursor-pointer",
                entry === safeCurrent
                  ? "bg-primary text-white border-2 border-[#001C26]"
                  : "bg-surface text-ink border border-border hover:bg-canvas-muted",
              ].join(" ")}
            >
              {entry}
            </button>
          ),
        )}

        <button
          type="button"
          onClick={() => onPageChange(safeCurrent + 1)}
          disabled={safeCurrent >= totalPages}
          aria-label="Next page"
          className="inline-flex items-center justify-center h-9 px-2.5 border border-border bg-surface text-sm font-medium text-ink hover:bg-canvas-muted disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          <span className="sr-only sm:not-sr-only sm:mr-1">Next</span>
          <ChevronRight className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
