"use client";

import { useEffect, useState } from "react";
import { getFileBlob } from "@/lib/storage/indexedDbFiles";
import type { ImageAsset } from "@/lib/types/content";

const IDB_PREFIX = "idb://";

export interface ContentImageProps {
  asset: ImageAsset;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
}

export function ContentImage({
  asset,
  className = "",
  width,
  height,
  priority = false,
}: ContentImageProps) {
  const isIdb = asset.src.startsWith(IDB_PREFIX);
  const idbId = isIdb ? asset.src.slice(IDB_PREFIX.length) : null;
  const [resolvedIdbUrl, setResolvedIdbUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!idbId) {
      setResolvedIdbUrl(null);
      return;
    }

    let active = true;
    let createdObjectUrl: string | null = null;
    setResolvedIdbUrl(null);

    void getFileBlob(idbId)
      .then((record) => {
        if (!record || typeof URL.createObjectURL !== "function") {
          if (active) setResolvedIdbUrl(null);
          return;
        }
        createdObjectUrl = URL.createObjectURL(record.blob);
        if (!active) {
          if (typeof URL.revokeObjectURL === "function") {
            URL.revokeObjectURL(createdObjectUrl);
          }
          createdObjectUrl = null;
          return;
        }
        setResolvedIdbUrl(createdObjectUrl);
      })
      .catch(() => {
        if (active) setResolvedIdbUrl(null);
      });

    return () => {
      active = false;
      if (createdObjectUrl) {
        if (typeof URL.revokeObjectURL === "function") {
          URL.revokeObjectURL(createdObjectUrl);
        }
        createdObjectUrl = null;
      }
    };
  }, [idbId]);

  const effectiveSrc = isIdb ? resolvedIdbUrl : asset.src;

  if (!effectiveSrc) {
    return (
      <div
        role="img"
        aria-label={asset.alt}
        style={
          width && height ? { width: `${width}px`, height: `${height}px` } : undefined
        }
        className={["bg-canvas-muted", className].filter(Boolean).join(" ")}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={effectiveSrc}
      alt={asset.alt}
      width={width}
      height={height}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={className}
    />
  );
}
