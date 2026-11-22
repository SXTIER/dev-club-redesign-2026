"use client";

import { useEffect, useId, useState } from "react";
import { ImageIcon, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ContentImage } from "@/components/ui/ContentImage";
import { FileDropzone } from "@/components/ui/FileDropzone";
import { MediaPickerModal } from "@/components/ui/MediaPickerModal";
import { Modal } from "@/components/ui/Modal";
import { useAppData } from "@/context/AppDataContext";
import type { EventUpdateInput } from "@/lib/services/contracts";
import { validateImageFile } from "@/lib/storage/svgSanitizer";
import type { ImageAsset } from "@/lib/types/content";
import type {
  EventCategory,
  EventItem,
  EventStatus,
  EventUpsertInput,
} from "@/lib/types/events";
import type { MediaAsset } from "@/lib/types/media";

export interface EventEditorModalProps {
  open: boolean;
  onClose: () => void;
  editingEvent?: EventItem | null;
  defaultOrder?: number;
  onSaved?: (event: EventItem, mode: "create" | "edit") => void;
}

interface FieldErrors {
  title?: string;
  dateLabel?: string;
  location?: string;
}

export function EventEditorModal({
  open,
  onClose,
  editingEvent = null,
  defaultOrder = 1,
  onSaved,
}: EventEditorModalProps) {
  const { services } = useAppData();

  const titleId = useId();
  const typeId = useId();
  const dateId = useId();
  const locationId = useId();
  const summaryId = useId();
  const markerId = useId();
  const orderId = useId();
  const descriptionId = useId();
  const showOnHomeId = useId();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<EventCategory>("Event");
  const [dateLabel, setDateLabel] = useState("");
  const [location, setLocation] = useState("");
  const [summary, setSummary] = useState("");
  const [marker, setMarker] = useState("");
  const [order, setOrder] = useState("1");
  const [description, setDescription] = useState("");
  const [showOnHome, setShowOnHome] = useState(false);

  const [pickedCoverImage, setPickedCoverImage] = useState<ImageAsset | null>(
    null,
  );
  const [selectedCoverFile, setSelectedCoverFile] = useState<File | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [removeCover, setRemoveCover] = useState(false);
  const [coverFileError, setCoverFileError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;

    setTitle(editingEvent?.title ?? "");
    setCategory(editingEvent?.category ?? "Event");
    setDateLabel(editingEvent?.dateLabel ?? "");
    setLocation(editingEvent?.location ?? "");
    setSummary(editingEvent?.subtitle ?? "");
    setMarker(editingEvent?.marker ?? "");
    setOrder(String(editingEvent?.order ?? defaultOrder));
    setDescription(editingEvent?.description ?? "");
    setShowOnHome(editingEvent?.showOnHome ?? false);
    setPickedCoverImage(editingEvent?.coverImage ?? null);
    setSelectedCoverFile(null);
    setRemoveCover(false);
    setCoverFileError(null);
    setPickerOpen(false);
    setErrors({});
    setSubmitError(null);
    setSubmitting(false);
  }, [open, editingEvent, defaultOrder]);

  useEffect(() => {
    if (
      !selectedCoverFile ||
      typeof URL === "undefined" ||
      typeof URL.createObjectURL !== "function"
    ) {
      setLocalPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(selectedCoverFile);
    setLocalPreviewUrl(objectUrl);

    return () => {
      if (typeof URL.revokeObjectURL === "function") {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [selectedCoverFile]);

  const handleFileSelected = (file: File) => {
    const check = validateImageFile(file);
    if (!check.ok) {
      setCoverFileError(check.error);
      return;
    }

    setCoverFileError(null);
    setSelectedCoverFile(file);
    setRemoveCover(false);
  };

  const handleAssetSelected = (asset: MediaAsset) => {
    setCoverFileError(null);
    setSelectedCoverFile(null);
    setRemoveCover(false);
    setPickedCoverImage({
      id: asset.id,
      src: asset.url,
      alt: asset.title || title.trim() || asset.filename,
    });
  };

  const handleRemoveCover = () => {
    setSelectedCoverFile(null);
    setPickedCoverImage(null);
    setCoverFileError(null);
    setRemoveCover(true);
  };

  const handleSave = async (targetStatus: EventStatus) => {
    if (submitting) return;

    const trimmedTitle = title.trim();
    const trimmedDate = dateLabel.trim();
    const trimmedLocation = location.trim();

    const nextErrors: FieldErrors = {
      title: trimmedTitle ? undefined : "Title is required.",
      dateLabel: trimmedDate ? undefined : "Date is required.",
      location: trimmedLocation ? undefined : "Location is required.",
    };

    if (nextErrors.title || nextErrors.dateLabel || nextErrors.location) {
      setErrors(nextErrors);
      setSubmitError(null);
      return;
    }

    const parsedOrder = Number.parseInt(order, 10);
    const safeOrder =
      Number.isFinite(parsedOrder) && parsedOrder >= 0
        ? parsedOrder
        : Math.max(0, defaultOrder);

    const resolvedSubtitle =
      summary.trim() || `${trimmedDate} · ${trimmedLocation}`;
    const resolvedMarker =
      marker.trim() || `${category} · ${String(safeOrder).padStart(2, "0")}`;
    const resolvedDescription =
      description.trim() || `${trimmedTitle} — ${trimmedLocation}`;

    setErrors({});
    setSubmitError(null);
    setSubmitting(true);

    try {
      let saved: EventItem;

      if (editingEvent) {
        const updatePayload: EventUpdateInput = {
          marker: resolvedMarker,
          title: trimmedTitle,
          subtitle: resolvedSubtitle,
          category,
          dateLabel: trimmedDate,
          location: trimmedLocation,
          description: resolvedDescription,
          status: targetStatus,
          showOnHome,
          order: safeOrder,
        };

        if (!selectedCoverFile) {
          if (removeCover) {
            updatePayload.coverImage = null;
          } else if (pickedCoverImage) {
            updatePayload.coverImage = {
              ...(pickedCoverImage.id ? { id: pickedCoverImage.id } : {}),
              src: pickedCoverImage.src,
              alt: pickedCoverImage.alt || trimmedTitle,
            };
          }
        }

        saved = await services.events.updateEvent(
          editingEvent.id,
          updatePayload,
          selectedCoverFile ?? undefined,
        );
        onSaved?.(saved, "edit");
      } else {
        const createPayload: EventUpsertInput = {
          marker: resolvedMarker,
          title: trimmedTitle,
          subtitle: resolvedSubtitle,
          category,
          dateLabel: trimmedDate,
          location: trimmedLocation,
          description: resolvedDescription,
          status: targetStatus,
          showOnHome,
          order: safeOrder,
          ...(!selectedCoverFile && pickedCoverImage && !removeCover
            ? {
                coverImage: {
                  ...(pickedCoverImage.id ? { id: pickedCoverImage.id } : {}),
                  src: pickedCoverImage.src,
                  alt: pickedCoverImage.alt || trimmedTitle,
                },
              }
            : {}),
        };

        saved = await services.events.createEvent(
          createPayload,
          selectedCoverFile ?? undefined,
        );
        onSaved?.(saved, "create");
      }

      onClose();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to save event.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const hasCover =
    selectedCoverFile !== null || (pickedCoverImage !== null && !removeCover);
  const markerBadgeText = String(
    Math.max(1, Number.parseInt(order, 10) || defaultOrder),
  ).padStart(2, "0");

  return (
    <>
      <Modal
        open={open}
        onClose={() => {
          if (!pickerOpen && !submitting) {
            onClose();
          }
        }}
        title={editingEvent ? "Edit Roadmap Event" : "Add Event / News"}
        subtitle={
          editingEvent
            ? "Update the event or announcement details and roadmap visibility."
            : "Create a new Event or News announcement for the roadmap and website."
        }
        maxWidthClass="max-w-3xl"
        footer={
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs sm:text-sm text-[#4A5565]">
              {editingEvent
                ? `Current status: ${editingEvent.status}${
                    editingEvent.showOnHome ? " · Shown on Home" : ""
                  }`
                : "Drafts are visible to admins only until published."}
            </p>
            <div className="flex flex-wrap items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="secondary"
                disabled={submitting}
                onClick={onClose}
                className="rounded-[5px] border-[#A1A7B4] text-[#0038E1]"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={submitting}
                onClick={() => void handleSave("Draft")}
                className="rounded-[5px] border-[#A1A7B4] text-[#0038E1]"
              >
                Save Draft
              </Button>
              <Button
                type="button"
                variant="primary"
                loading={submitting}
                onClick={() => void handleSave("Published")}
                className="rounded-[5px] border-0"
              >
                Publish
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          {submitError ? (
            <div
              role="alert"
              className="rounded-[8px] border border-[#FB4A2A] bg-[#FAAF98]/35 px-4 py-3 text-sm font-medium text-[#B41B00]"
            >
              {submitError}
            </div>
          ) : null}

          <div className="space-y-1.5">
            <label
              htmlFor={titleId}
              className="block text-sm font-medium text-[#4A5565]"
            >
              Title <span className="text-[#B41B00]">*</span>
            </label>
            <input
              id={titleId}
              type="text"
              required
              value={title}
              onChange={(event) => {
                const next = event.target.value;
                setTitle(next);
                if (errors.title && next.trim()) {
                  setErrors((prev) => ({ ...prev, title: undefined }));
                }
              }}
              placeholder="e.g. Modern Web & Next.js Workshop"
              aria-invalid={errors.title ? "true" : "false"}
              className={[
                "w-full h-11 px-3.5 rounded-[5px] border bg-white text-base text-[#1C1B1F] placeholder:text-[#757E91] focus:outline-none focus:border-[#0038E1]",
                errors.title ? "border-[#FB4A2A]" : "border-[#A1A7B4]",
              ].join(" ")}
            />
            {errors.title ? (
              <p className="text-xs font-medium text-[#B41B00]">{errors.title}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label
                htmlFor={typeId}
                className="block text-sm font-medium text-[#4A5565]"
              >
                Type
              </label>
              <select
                id={typeId}
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value as EventCategory)
                }
                className="w-full h-11 px-3.5 rounded-[5px] border border-[#A1A7B4] bg-white text-base text-[#1C1B1F] focus:outline-none focus:border-[#0038E1] cursor-pointer"
              >
                <option value="Event">Event</option>
                <option value="News">News</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor={dateId}
                className="block text-sm font-medium text-[#4A5565]"
              >
                Date <span className="text-[#B41B00]">*</span>
              </label>
              <input
                id={dateId}
                type="text"
                required
                value={dateLabel}
                onChange={(event) => {
                  const next = event.target.value;
                  setDateLabel(next);
                  if (errors.dateLabel && next.trim()) {
                    setErrors((prev) => ({ ...prev, dateLabel: undefined }));
                  }
                }}
                placeholder="e.g. 15 Dec 2026 · 09:00"
                aria-invalid={errors.dateLabel ? "true" : "false"}
                className={[
                  "w-full h-11 px-3.5 rounded-[5px] border bg-white font-mono text-sm sm:text-base text-[#1C1B1F] placeholder:text-[#757E91] focus:outline-none focus:border-[#0038E1]",
                  errors.dateLabel ? "border-[#FB4A2A]" : "border-[#A1A7B4]",
                ].join(" ")}
              />
              {errors.dateLabel ? (
                <p className="text-xs font-medium text-[#B41B00]">
                  {errors.dateLabel}
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <label
                htmlFor={locationId}
                className="block text-sm font-medium text-[#4A5565]"
              >
                Location <span className="text-[#B41B00]">*</span>
              </label>
              <input
                id={locationId}
                type="text"
                required
                value={location}
                onChange={(event) => {
                  const next = event.target.value;
                  setLocation(next);
                  if (errors.location && next.trim()) {
                    setErrors((prev) => ({ ...prev, location: undefined }));
                  }
                }}
                placeholder="e.g. IT-105 Auditorium, Faculty of ICT"
                aria-invalid={errors.location ? "true" : "false"}
                className={[
                  "w-full h-11 px-3.5 rounded-[5px] border bg-white text-base text-[#1C1B1F] placeholder:text-[#757E91] focus:outline-none focus:border-[#0038E1]",
                  errors.location ? "border-[#FB4A2A]" : "border-[#A1A7B4]",
                ].join(" ")}
              />
              {errors.location ? (
                <p className="text-xs font-medium text-[#B41B00]">
                  {errors.location}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor={orderId}
                className="block text-sm font-medium text-[#4A5565]"
              >
                Display order
              </label>
              <input
                id={orderId}
                type="number"
                min={0}
                value={order}
                onChange={(event) => setOrder(event.target.value)}
                className="w-full h-11 px-3.5 rounded-[5px] border border-[#A1A7B4] bg-white font-mono text-base text-[#1C1B1F] focus:outline-none focus:border-[#0038E1]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label
                htmlFor={summaryId}
                className="block text-sm font-medium text-[#4A5565]"
              >
                Summary tagline
              </label>
              <input
                id={summaryId}
                type="text"
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                placeholder="Short one-line summary shown on Timeline card"
                className="w-full h-11 px-3.5 rounded-[5px] border border-[#A1A7B4] bg-white text-sm sm:text-base text-[#1C1B1F] placeholder:text-[#757E91] focus:outline-none focus:border-[#0038E1]"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor={markerId}
                className="block text-sm font-medium text-[#4A5565]"
              >
                Roadmap marker
              </label>
              <input
                id={markerId}
                type="text"
                value={marker}
                onChange={(event) => setMarker(event.target.value)}
                placeholder="e.g. Phase 01 · All Teams"
                className="w-full h-11 px-3.5 rounded-[5px] border border-[#A1A7B4] bg-white font-mono text-sm text-[#1C1B1F] placeholder:text-[#757E91] focus:outline-none focus:border-[#0038E1]"
              />
            </div>
          </div>

          {/* Cover Image Section */}
          <div className="space-y-3 rounded-[8px] border border-[#A1A7B4] bg-[#F8FAFC] p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-24 h-16 shrink-0 rounded-[5px] border border-[#E2E8F0] bg-[#1C1B1F] flex items-center justify-center overflow-hidden">
                  {selectedCoverFile && localPreviewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={localPreviewUrl}
                      alt={selectedCoverFile.name}
                      className="w-full h-full object-cover"
                    />
                  ) : !selectedCoverFile && pickedCoverImage && !removeCover ? (
                    <ContentImage
                      asset={pickedCoverImage}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="font-mono text-base font-medium text-white">
                      {markerBadgeText}
                    </span>
                  )}
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#1C1B1F] truncate">
                    {selectedCoverFile
                      ? selectedCoverFile.name
                      : pickedCoverImage && !removeCover
                        ? pickedCoverImage.alt || pickedCoverImage.src
                        : "Cover Image (Optional)"}
                  </p>
                  <p className="text-xs text-[#4A5565] mt-0.5">
                    {selectedCoverFile
                      ? "New file selected · Will register in Media & Assets when saved."
                      : pickedCoverImage && !removeCover
                        ? "Displayed inside Home Event Detail Modal."
                        : "Upload a cover image or pick from Media & Assets."}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={submitting}
                  onClick={() => setPickerOpen(true)}
                  className="rounded-[5px] border-[#A1A7B4] text-[#0038E1]"
                >
                  <ImageIcon className="w-3.5 h-3.5" aria-hidden="true" />
                  Choose from Media Library
                </Button>

                {hasCover ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={submitting}
                    onClick={handleRemoveCover}
                    className="rounded-[5px] text-[#B41B00] hover:bg-[#FAAF98]/30"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    Remove Cover
                  </Button>
                ) : null}
              </div>
            </div>

            <FileDropzone
              label="Upload cover image"
              ariaLabel="Upload cover image"
              helper="PNG, JPG, WebP, GIF, or sanitized SVG ≤ 10 MB · Registers automatically in Media & Assets"
              accept=".png,.jpg,.jpeg,.webp,.gif,.svg,image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
              disabled={submitting}
              selectedFileName={selectedCoverFile?.name ?? null}
              error={coverFileError}
              buttonLabel="Browse Image"
              onFileSelected={handleFileSelected}
              onClear={() => {
                setSelectedCoverFile(null);
                setCoverFileError(null);
              }}
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor={descriptionId}
              className="block text-sm font-medium text-[#4A5565]"
            >
              Description
            </label>
            <textarea
              id={descriptionId}
              rows={4}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Full event agenda, speaker notes, or announcement copy..."
              className="w-full min-h-[108px] px-3.5 py-2.5 rounded-[5px] border border-[#A1A7B4] bg-white text-sm sm:text-base text-[#1C1B1F] placeholder:text-[#757E91] focus:outline-none focus:border-[#0038E1]"
            />
          </div>

          <div className="flex items-start gap-3 rounded-[8px] border border-[#E2E8F0] bg-[#F8FAFC] p-3.5">
            <input
              id={showOnHomeId}
              type="checkbox"
              checked={showOnHome}
              onChange={(event) => setShowOnHome(event.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-[#0038E1] rounded border border-[#A1A7B4] cursor-pointer"
            />
            <div className="space-y-0.5">
              <label
                htmlFor={showOnHomeId}
                className="block text-sm font-medium text-[#1C1B1F] cursor-pointer"
              >
                Show on Home
              </label>
              <p className="text-xs text-[#4A5565]">
                Include this item in the public Home / Event Roadmap timeline once
                published.
              </p>
            </div>
          </div>
        </div>
      </Modal>

      <MediaPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelectAsset={handleAssetSelected}
        title="Choose Event Cover Image"
      />
    </>
  );
}
