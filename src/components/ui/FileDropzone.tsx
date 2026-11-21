"use client";

import { useId, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { FileUp, X } from "lucide-react";

export interface FileDropzoneProps {
  id?: string;
  label: string;
  helper?: string;
  accept?: string;
  maxBytes?: number;
  error?: string | null;
  disabled?: boolean;
  selectedFileName?: string | null;
  buttonLabel?: string;
  ariaLabel?: string;
  onFileSelected: (file: File) => void;
  onClear?: () => void;
  className?: string;
}

export function FileDropzone({
  id,
  label,
  helper,
  accept,
  maxBytes,
  error,
  disabled = false,
  selectedFileName,
  buttonLabel = "Choose file",
  ariaLabel,
  onFileSelected,
  onClear,
  className = "",
}: FileDropzoneProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const displayedError = error ?? localError;

  const handleFile = (file: File | undefined | null) => {
    if (!file || disabled) return;
    if (maxBytes !== undefined && file.size > maxBytes) {
      const mb = Math.round((maxBytes / (1024 * 1024)) * 10) / 10;
      setLocalError(`File exceeds the ${mb} MB maximum size limit.`);
      return;
    }
    setLocalError(null);
    onFileSelected(file);
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    handleFile(file);
    event.target.value = "";
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const file = event.dataTransfer.files?.[0];
    handleFile(file);
  };

  return (
    <div className={["space-y-2", className].filter(Boolean).join(" ")}>
      <label
        htmlFor={inputId}
        className="block text-sm font-medium text-ink"
      >
        {label}
      </label>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={[
          "relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-2 border-dashed p-4 transition-colors",
          disabled ? "opacity-50 cursor-not-allowed bg-canvas-muted" : "bg-surface",
          displayedError
            ? "border-danger-border bg-danger-bg/20"
            : isDragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-gray",
        ].join(" ")}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={accept}
          disabled={disabled}
          aria-label={ariaLabel ?? label}
          onChange={handleInputChange}
          className="sr-only"
        />

        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className="shrink-0 w-10 h-10 flex items-center justify-center bg-canvas-muted border border-border text-primary">
            <FileUp className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink truncate">
              {selectedFileName || "Drag and drop a file here, or browse"}
            </p>
            {helper ? (
              <p className="text-xs text-gray mt-0.5">{helper}</p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {selectedFileName && onClear ? (
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                setLocalError(null);
                onClear();
              }}
              aria-label="Clear selected file"
              className="inline-flex items-center justify-center w-9 h-9 border border-border text-dark-gray hover:bg-canvas-muted transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          ) : null}
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center justify-center h-9 px-4 bg-surface border border-[#001C26] text-sm font-medium text-ink hover:bg-canvas-muted transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            {buttonLabel}
          </button>
        </div>
      </div>

      {displayedError ? (
        <p role="alert" className="text-xs font-medium text-danger-text">
          {displayedError}
        </p>
      ) : null}
    </div>
  );
}
