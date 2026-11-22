"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  Copy,
  Link2,
  Search,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ContentImage } from "@/components/ui/ContentImage";
import { FileDropzone } from "@/components/ui/FileDropzone";
import { Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { useAppData } from "@/context/AppDataContext";
import { ApiError } from "@/lib/services/contracts";
import { validateImageFile } from "@/lib/storage/svgSanitizer";
import {
  editableImageSlotSchema,
  type EditableImageSlot,
} from "@/lib/types/content";
import type { MediaAsset, MediaKind } from "@/lib/types/media";

type KindFilter = "all" | MediaKind;
type SortOption = "newest" | "oldest" | "alpha";

const PAGE_SIZE = 9;

const SLOT_METADATA: Record<
  EditableImageSlot,
  { label: string; description: string }
> = {
  "site.logoDark": {
    label: "Site · Dark Logo (Navbar)",
    description: "Shown on the light public and admin navigation headers.",
  },
  "site.logoLight": {
    label: "Site · White Logo (Footer)",
    description: "Shown on the dark footer across public pages.",
  },
  "home.hero.heroArtwork": {
    label: "Home · Hero Banner Artwork",
    description: "Primary right-hand graphic inside the Home hero banner.",
  },
  "home.location.image": {
    label: "Home · Location Campus Photo",
    description: "Campus building photo inside the Home location section.",
  },
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function extractUsedByList(error: unknown, fallbackSlot?: string): string[] {
  if (error instanceof ApiError && error.details && typeof error.details === "object") {
    const details = error.details as { usedBy?: unknown };
    if (Array.isArray(details.usedBy)) {
      const list = details.usedBy.filter(
        (entry): entry is string => typeof entry === "string" && entry.length > 0,
      );
      if (list.length > 0) return list;
    }
  }
  return fallbackSlot ? [fallbackSlot] : [];
}

export function MediaLibraryTab() {
  const { media, site, home, services } = useAppData();

  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [currentPage, setCurrentPage] = useState(1);

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<{
    tone: "success" | "warning";
    message: string;
  } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [assignModalAsset, setAssignModalAsset] = useState<MediaAsset | null>(
    null,
  );
  const [assigningSlot, setAssigningSlot] = useState<EditableImageSlot | null>(
    null,
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const counts = useMemo(() => {
    let images = 0;
    let svgs = 0;
    for (const item of media) {
      if (item.kind === "svg") svgs += 1;
      else images += 1;
    }
    return {
      all: media.length,
      image: images,
      svg: svgs,
    };
  }, [media]);

  const filteredSortedMedia = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const filtered = media.filter((item) => {
      if (kindFilter !== "all" && item.kind !== kindFilter) {
        return false;
      }
      if (!q) return true;
      return (
        item.filename.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q) ||
        (item.sourceSlot?.toLowerCase().includes(q) ?? false)
      );
    });

    const indexed = filtered.map((item, idx) => ({ item, idx }));
    indexed.sort((a, b) => {
      if (sortBy === "alpha") {
        const cmp = a.item.filename.localeCompare(b.item.filename, undefined, {
          sensitivity: "base",
        });
        if (cmp !== 0) return cmp;
        return a.item.title.localeCompare(b.item.title);
      }
      const timeCmp = a.item.createdAt.localeCompare(b.item.createdAt);
      if (sortBy === "newest") {
        if (timeCmp !== 0) return -timeCmp;
        return a.idx - b.idx;
      }
      if (timeCmp !== 0) return timeCmp;
      return a.idx - b.idx;
    });

    return indexed.map((entry) => entry.item);
  }, [media, kindFilter, searchQuery, sortBy]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredSortedMedia.length / PAGE_SIZE),
  );
  const safePage = Math.min(currentPage, totalPages);

  const pagedAssets = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredSortedMedia.slice(start, start + PAGE_SIZE);
  }, [filteredSortedMedia, safePage]);

  const handleFilterChange = (next: KindFilter) => {
    setKindFilter(next);
    setCurrentPage(1);
  };

  const handleSearchChange = (next: string) => {
    setSearchQuery(next);
    setCurrentPage(1);
  };

  const handleSortChange = (next: SortOption) => {
    setSortBy(next);
    setCurrentPage(1);
  };

  const handleFileSelected = async (file: File) => {
    setActionError(null);
    setStatusNotice(null);

    const validation = validateImageFile(file);
    if (!validation.ok) {
      setUploadError(validation.error);
      return;
    }

    setUploadError(null);
    setUploading(true);
    try {
      const uploaded = await services.media.uploadMedia({ file });
      if (uploaded.sanitized) {
        setStatusNotice({
          tone: "warning",
          message: `Uploaded "${uploaded.filename}" — SVG was sanitized before saving (${uploaded.sanitizationNote ?? "unsafe markup removed"}).`,
        });
      } else {
        setStatusNotice({
          tone: "success",
          message: `Uploaded "${uploaded.filename}" (${uploaded.kind === "svg" ? "SVG" : "Image"}).`,
        });
      }
      setCurrentPage(1);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Failed to upload media file.",
      );
    } finally {
      setUploading(false);
    }
  };

  const handleCopyUrl = async (asset: MediaAsset) => {
    try {
      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === "function"
      ) {
        await navigator.clipboard.writeText(asset.url);
      }
    } catch {
      // Clipboard may be unavailable in restricted contexts; still provide UI feedback.
    }

    setCopiedId(asset.id);
    if (copyTimerRef.current) {
      clearTimeout(copyTimerRef.current);
    }
    copyTimerRef.current = setTimeout(() => {
      setCopiedId((prev) => (prev === asset.id ? null : prev));
    }, 2000);
  };

  const handleAssignSlot = async (slot: EditableImageSlot) => {
    if (!assignModalAsset) return;
    setActionError(null);
    setAssigningSlot(slot);
    try {
      await services.media.assignMediaToSlot(assignModalAsset.id, slot);
      setStatusNotice({
        tone: "success",
        message: `Assigned "${assignModalAsset.filename}" to ${SLOT_METADATA[slot].label} (${slot}).`,
      });
      setAssignModalAsset(null);
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Failed to assign asset to content slot.",
      );
      setAssignModalAsset(null);
    } finally {
      setAssigningSlot(null);
    }
  };

  const handleDeleteAsset = async (asset: MediaAsset) => {
    setActionError(null);
    setStatusNotice(null);
    setDeletingId(asset.id);
    try {
      await services.media.deleteMedia(asset.id);
      setStatusNotice({
        tone: "success",
        message: `Deleted "${asset.filename}" from Media & Assets.`,
      });
    } catch (err) {
      const isInUse =
        (err instanceof ApiError &&
          (err.code === "ASSET_IN_USE" || err.status === 409)) ||
        (err instanceof Error && /in use/i.test(err.message));

      if (isInUse) {
        const usedBy = extractUsedByList(err, asset.sourceSlot);
        setActionError(
          usedBy.length > 0
            ? `Cannot delete "${asset.filename}": asset is currently in use by ${usedBy.join(", ")}. Reassign or remove references first.`
            : `Cannot delete "${asset.filename}": asset is currently in use by a live slot or event.`,
        );
      } else {
        setActionError(
          err instanceof Error ? err.message : "Failed to delete media asset.",
        );
      }
    } finally {
      setDeletingId(null);
    }
  };

  const currentSlotSources: Record<EditableImageSlot, string> = {
    "site.logoDark": site.logoDark.src,
    "site.logoLight": site.logoLight.src,
    "home.hero.heroArtwork": home.hero.heroArtwork.src,
    "home.location.image": home.location.image.src,
  };

  return (
    <div className="space-y-6">
      {/* Drag & Drop Upload Card */}
      <div className="bg-white border border-dashed border-[#A1A7B4] rounded-[16px] p-5 sm:p-6 space-y-4">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-[24px] font-medium text-[#1C1B1F]">
            Drag &amp; drop images or SVG files here
          </h2>
          <p className="text-sm text-[#4A5565]">
            Upload PNG, JPG, WebP, GIF, or SVG assets up to 10 MB. SVGs are
            checked with DOMParser to strip scripts and unsafe event handlers.
          </p>
        </div>

        <FileDropzone
          label="Upload media"
          ariaLabel="Upload media"
          helper="PNG, JPG, WebP, GIF, SVG · Up to 10 MB per file"
          accept=".png,.jpg,.jpeg,.webp,.gif,.svg,image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
          disabled={uploading}
          error={uploadError}
          buttonLabel={uploading ? "Uploading..." : "Browse Files"}
          onFileSelected={(file) => void handleFileSelected(file)}
        />
      </div>

      {/* Inline Upload / Sanitization / Error Feedback */}
      {statusNotice ? (
        <div
          role="status"
          className={[
            "rounded-[10px] border px-4 py-3 text-sm font-medium flex items-start gap-2.5",
            statusNotice.tone === "warning"
              ? "border-[#FAA100] bg-[#FFF194] text-[#AA5000]"
              : "border-[#A9E041] bg-[#E7FDA7]/60 text-[#548000]",
          ].join(" ")}
        >
          {statusNotice.tone === "warning" ? (
            <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
          ) : (
            <Check className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
          )}
          <span>{statusNotice.message}</span>
        </div>
      ) : null}

      {actionError ? (
        <div
          role="alert"
          className="rounded-[10px] border border-[#FB4A2A] bg-[#FAAF98]/40 text-[#B41B00] px-4 py-3 text-sm font-medium flex items-start gap-2.5"
        >
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{actionError}</span>
        </div>
      ) : null}

      {/* Filter Tabs + Search + Sort Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div
          role="group"
          aria-label="Filter media type"
          className="inline-flex border border-[#A1A7B4] rounded-[5px] bg-white overflow-hidden self-start"
        >
          {(
            [
              { id: "all", label: `All (${counts.all})` },
              { id: "image", label: `Images (${counts.image})` },
              { id: "svg", label: `SVG (${counts.svg})` },
            ] as const
          ).map((tab) => {
            const active = kindFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                aria-pressed={active}
                onClick={() => handleFilterChange(tab.id)}
                className={[
                  "h-11 px-4 text-sm sm:text-base transition-colors cursor-pointer whitespace-nowrap",
                  active
                    ? "bg-[#0038E1] text-white font-medium"
                    : "bg-white text-[#4A5565] hover:bg-[#F4F5F7]",
                ].join(" ")}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative sm:w-72">
            <Search
              className="w-4 h-4 text-[#757E91] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => handleSearchChange(event.target.value)}
              aria-label="Search media assets"
              placeholder="Search by filename..."
              className="w-full h-11 pl-10 pr-3.5 bg-white border border-[#A1A7B4] rounded-[5px] text-sm sm:text-base text-[#1C1B1F] placeholder:text-[#757E91] focus:outline-none focus:border-[#0038E1]"
            />
          </div>

          <select
            aria-label="Sort media assets"
            value={sortBy}
            onChange={(event) =>
              handleSortChange(event.target.value as SortOption)
            }
            className="h-11 px-3.5 bg-white border border-[#A1A7B4] rounded-[5px] text-sm sm:text-base text-[#0038E1] font-medium focus:outline-none focus:border-[#0038E1] cursor-pointer"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="alpha">Alphabetical</option>
          </select>
        </div>
      </div>

      {/* Asset Grid */}
      {pagedAssets.length === 0 ? (
        <div className="bg-white border border-[#A1A7B4] rounded-[16px] p-10 text-center space-y-1.5">
          <p className="text-base font-medium text-[#1C1B1F]">
            No matching assets found.
          </p>
          <p className="text-sm text-[#4A5565]">
            Try clearing your search or switching filter tabs, or upload a new
            image above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {pagedAssets.map((asset) => {
            const isCopied = copiedId === asset.id;
            const isDeleting = deletingId === asset.id;
            const isLocalIdb = asset.url.startsWith("idb://");

            return (
              <article
                key={asset.id}
                data-testid={`media-card-${asset.id}`}
                className="bg-white border border-[#A1A7B4] rounded-[16px] p-4 flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  {/* Preview Container with subtle contrast frame so white SVGs stay visible */}
                  <div className="h-44 rounded-[8px] border border-[#E2E8F0] bg-[#E8ECF4] flex items-center justify-center overflow-hidden p-3">
                    <ContentImage
                      asset={{ id: asset.id, src: asset.url, alt: asset.title }}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>

                  {/* Metadata */}
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-base font-medium text-[#1C1B1F] truncate">
                        {asset.title}
                      </h3>
                      <Badge tone={asset.kind === "svg" ? "info" : "neutral"}>
                        {asset.kind === "svg" ? "SVG" : "Image"}
                      </Badge>
                    </div>

                    <p className="font-mono text-xs text-[#4A5565] truncate">
                      {asset.filename}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#757E91]">
                      <span>{formatBytes(asset.sizeBytes)}</span>
                      {asset.width && asset.height ? (
                        <span>
                          · {asset.width} × {asset.height}
                        </span>
                      ) : null}
                      {isLocalIdb ? (
                        <span className="font-mono text-[#AA5000]">
                          · idb://
                        </span>
                      ) : null}
                    </div>

                    {asset.sourceSlot ? (
                      <div className="pt-1">
                        <Badge tone="teal">
                          Slot: {asset.sourceSlot}
                        </Badge>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => void handleCopyUrl(asset)}
                      className="rounded-[5px] border-[#A1A7B4] text-[#0038E1]"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5" aria-hidden="true" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                          Copy URL
                        </>
                      )}
                    </Button>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setActionError(null);
                        setAssignModalAsset(asset);
                      }}
                      className="rounded-[5px] border-[#A1A7B4] text-[#1C1B1F]"
                    >
                      <Link2 className="w-3.5 h-3.5" aria-hidden="true" />
                      Assign to Slot
                    </Button>
                  </div>

                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => void handleDeleteAsset(asset)}
                    className="inline-flex items-center gap-1 h-9 px-2.5 text-sm font-medium text-[#B41B00] hover:bg-[#FAAF98]/30 rounded-[5px] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    Delete
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Summary & Pagination */}
      {totalPages > 1 ? (
        <Pagination
          currentPage={safePage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={filteredSortedMedia.length}
          pageSize={PAGE_SIZE}
        />
      ) : filteredSortedMedia.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-[#4A5565]">
          <p>
            Showing {filteredSortedMedia.length} asset
            {filteredSortedMedia.length === 1 ? "" : "s"}
          </p>
          <p className="font-mono text-[#0038E1]">
            1–{filteredSortedMedia.length} of {filteredSortedMedia.length}
          </p>
        </div>
      ) : null}

      {/* Assign to Slot Modal */}
      <Modal
        open={assignModalAsset !== null}
        onClose={() => {
          if (!assigningSlot) setAssignModalAsset(null);
        }}
        title="Assign Asset to Content Slot"
        subtitle={
          assignModalAsset
            ? `Choose which editable image slot should display "${assignModalAsset.filename}".`
            : undefined
        }
      >
        {assignModalAsset ? (
          <div className="space-y-3">
            {editableImageSlotSchema.options.map((slot) => {
              const meta = SLOT_METADATA[slot];
              const isAssignedHere =
                assignModalAsset.sourceSlot === slot ||
                currentSlotSources[slot] === assignModalAsset.url;
              const isBusy = assigningSlot === slot;

              return (
                <button
                  key={slot}
                  type="button"
                  disabled={assigningSlot !== null}
                  onClick={() => void handleAssignSlot(slot)}
                  className={[
                    "w-full text-left border rounded-[10px] p-4 transition-colors cursor-pointer disabled:opacity-60",
                    isAssignedHere
                      ? "border-[#0038E1] bg-[#A6C0FF]/20"
                      : "border-[#E2E8F0] bg-white hover:border-[#0038E1] hover:bg-[#F8FAFC]",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <p className="text-sm font-semibold text-[#1C1B1F]">
                        {meta.label}
                      </p>
                      <p className="font-mono text-xs text-[#0038E1]">{slot}</p>
                      <p className="text-xs text-[#4A5565]">
                        {meta.description}
                      </p>
                    </div>
                    <span className="shrink-0">
                      {isBusy ? (
                        <Badge tone="info">Assigning...</Badge>
                      ) : isAssignedHere ? (
                        <Badge tone="teal">Currently assigned</Badge>
                      ) : (
                        <Badge tone="neutral">Assign</Badge>
                      )}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
