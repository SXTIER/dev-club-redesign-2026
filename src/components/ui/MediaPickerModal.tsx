"use client";

import { useMemo, useState } from "react";
import { Search, Upload } from "lucide-react";
import { useAppData } from "@/context/AppDataContext";
import { validateImageFile } from "@/lib/storage/svgSanitizer";
import type { MediaAsset, MediaKind } from "@/lib/types/media";
import { Badge } from "./Badge";
import { Button } from "./Button";
import { ContentImage } from "./ContentImage";
import { FileDropzone } from "./FileDropzone";
import { Modal } from "./Modal";

export interface MediaPickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelectAsset: (asset: MediaAsset) => void;
  title?: string;
}

type KindFilter = "all" | MediaKind;

export function MediaPickerModal({
  open,
  onClose,
  onSelectAsset,
  title = "Choose Media Asset",
}: MediaPickerModalProps) {
  const { media, services } = useAppData();
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const filteredMedia = useMemo(() => {
    const q = query.trim().toLowerCase();
    return media.filter((item) => {
      if (kindFilter !== "all" && item.kind !== kindFilter) {
        return false;
      }
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.filename.toLowerCase().includes(q)
      );
    });
  }, [media, query, kindFilter]);

  const handleSelect = (asset: MediaAsset) => {
    onSelectAsset(asset);
    onClose();
  };

  const handleUploadFile = async (file: File) => {
    const check = validateImageFile(file);
    if (!check.ok) {
      setUploadError(check.error);
      return;
    }

    setUploading(true);
    setUploadError(null);
    try {
      const uploaded = await services.media.uploadMedia({ file });
      setShowUpload(false);
      onSelectAsset(uploaded);
      onClose();
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Failed to upload media asset.",
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      subtitle="Select an existing asset from the Media Library or upload a new image."
      maxWidthClass="max-w-3xl"
    >
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search
              className="w-4 h-4 text-gray absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search media by title or filename..."
              aria-label="Search media"
              className="w-full h-10 pl-9 pr-3 border border-border bg-surface text-sm text-ink placeholder:text-light-gray focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div
              role="group"
              aria-label="Filter media type"
              className="inline-flex border border-border bg-canvas"
            >
              {(
                [
                  { id: "all", label: "All" },
                  { id: "image", label: "Images" },
                  { id: "svg", label: "SVG" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setKindFilter(tab.id)}
                  className={[
                    "h-9 px-3 text-xs font-semibold transition-colors cursor-pointer",
                    kindFilter === tab.id
                      ? "bg-primary text-white"
                      : "text-dark-gray hover:bg-canvas-muted",
                  ].join(" ")}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <Button
              variant={showUpload ? "secondary" : "lime"}
              size="sm"
              onClick={() => {
                setShowUpload((prev) => !prev);
                setUploadError(null);
              }}
            >
              <Upload className="w-4 h-4" aria-hidden="true" />
              Upload New
            </Button>
          </div>
        </div>

        {showUpload ? (
          <div className="border border-border bg-canvas p-4">
            <FileDropzone
              label="Upload new image or SVG"
              helper="PNG, JPG, WEBP, GIF, or sanitized SVG up to 10 MB"
              accept=".png,.jpg,.jpeg,.webp,.gif,.svg,image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
              disabled={uploading}
              error={uploadError}
              buttonLabel={uploading ? "Uploading..." : "Select image"}
              onFileSelected={(file) => void handleUploadFile(file)}
            />
          </div>
        ) : null}

        {filteredMedia.length === 0 ? (
          <div className="border border-border bg-canvas p-8 text-center">
            <p className="text-sm font-medium text-ink">
              No matching media assets found.
            </p>
            <p className="mt-1 text-xs text-gray">
              Try clearing your search or upload a new image above.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredMedia.map((asset) => (
              <button
                key={asset.id}
                type="button"
                onClick={() => handleSelect(asset)}
                className="group text-left border border-border bg-surface hover:border-primary transition-colors p-3 flex flex-col gap-2.5 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <div className="w-full h-28 bg-canvas-muted border border-border-subtle flex items-center justify-center overflow-hidden p-2">
                  <ContentImage
                    asset={{ id: asset.id, src: asset.url, alt: asset.title }}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                <div className="min-w-0 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-ink truncate group-hover:text-primary">
                      {asset.title}
                    </p>
                    <Badge tone={asset.kind === "svg" ? "info" : "neutral"}>
                      {asset.kind.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray truncate font-mono">
                    {asset.filename}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
