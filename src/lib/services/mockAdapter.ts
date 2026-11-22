import { z } from "zod";
import adminSeedJson from "@/content/admin-seed.json";
import eventsJson from "@/content/events.json";
import homeJson from "@/content/home.json";
import legalJson from "@/content/legal.json";
import mediaJson from "@/content/media.json";
import recruitmentJson from "@/content/recruitment.json";
import siteJson from "@/content/site.json";
import { deleteFile, getFileBlob, putFile } from "@/lib/storage/indexedDbFiles";
import { readOverlay, writeOverlay } from "@/lib/storage/localOverlay";
import {
  sanitizeSvgText,
  validateCvFile,
  validateImageFile,
} from "@/lib/storage/svgSanitizer";
import { adminSeedSchema, signinMemeSlideSchema } from "@/lib/types/adminSeed";
import {
  adminSessionSchema,
  loginInputSchema,
  type AdminSession,
  type LoginInput,
} from "@/lib/types/auth";
import {
  contentSectionKeySchema,
  editableImageSlotSchema,
  homeContentSchema,
  legalContentSchema,
  recruitmentContentSchema,
  siteContentSchema,
  type ContentSectionKey,
  type EditableImageSlot,
  type FaqItem,
  type HomeContent,
  type ImageAsset,
  type SiteContent,
} from "@/lib/types/content";
import {
  eventItemSchema,
  eventsListSchema,
  eventUpsertInputSchema,
  type EventItem,
  type EventUpsertInput,
} from "@/lib/types/events";
import {
  faqBankItemSchema,
  inquiryCreateInputSchema,
  inquiryItemSchema,
  replyInputSchema,
  type FaqBankItem,
  type InquiryCreateInput,
  type InquiryItem,
} from "@/lib/types/inquiries";
import { mediaListSchema, type MediaAsset } from "@/lib/types/media";
import {
  applicationStatusSchema,
  recruitmentApplicationSchema,
  recruitmentSubmitInputSchema,
  type ApplicationStatus,
  type RecruitmentApplication,
  type RecruitmentSubmitInput,
} from "@/lib/types/recruitment";
import {
  ApiError,
  type ContentSectionMap,
  type CvDownloadInfo,
  type EventListFilters,
  type EventUpdateInput,
  type FaqBankCreateInput,
  type FaqBankUpdateInput,
  type MediaUploadRequest,
  type ReplyInquiryInput,
  type ServiceBundle,
  type UploadedMediaAsset,
} from "./contracts";

export const ADMIN_SESSION_STORAGE_KEY = "muict_devclub_v1_admin_session";

const applicationsListSchema = z.array(recruitmentApplicationSchema);
const inquiriesListSchema = z.array(inquiryItemSchema);
const faqBankListSchema = z.array(faqBankItemSchema);
const signinMemesListSchema = z.array(signinMemeSlideSchema);

const CONTENT_SCHEMAS: {
  [K in ContentSectionKey]: z.ZodType<ContentSectionMap[K]>;
} = {
  site: siteContentSchema,
  home: homeContentSchema,
  recruitment: recruitmentContentSchema,
  legal: legalContentSchema,
};

function cloneValue<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

const DEFAULT_ADMIN_SEED = adminSeedSchema.parse(adminSeedJson);
const DEFAULT_SITE = siteContentSchema.parse(siteJson);
const DEFAULT_HOME = homeContentSchema.parse(homeJson);
const DEFAULT_RECRUITMENT = recruitmentContentSchema.parse(recruitmentJson);
const DEFAULT_LEGAL = legalContentSchema.parse(legalJson);
const DEFAULT_EVENTS = eventsListSchema.parse(eventsJson);
const DEFAULT_MEDIA = mediaListSchema.parse(mediaJson);

function getDefaultSection<K extends ContentSectionKey>(
  key: K,
): ContentSectionMap[K] {
  const defaults: ContentSectionMap = {
    site: DEFAULT_SITE,
    home: DEFAULT_HOME,
    recruitment: DEFAULT_RECRUITMENT,
    legal: DEFAULT_LEGAL,
  };
  return cloneValue(defaults[key]);
}

function generateId(prefix: string): string {
  const uuid =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().slice(0, 8)
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  return `${prefix}-${uuid}`;
}

function getSafeSessionStorage(): Storage | null {
  try {
    if (typeof window === "undefined" || typeof sessionStorage === "undefined") {
      return null;
    }
    return sessionStorage;
  } catch {
    return null;
  }
}

async function readFileAsText(file: File): Promise<string> {
  if (typeof file.text === "function") {
    return file.text();
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () =>
      reject(reader.error ?? new Error("Failed to read file as text."));
    reader.readAsText(file);
  });
}

async function readBlobBytes(blob: Blob): Promise<Uint8Array> {
  if (typeof blob.arrayBuffer === "function") {
    return new Uint8Array(await blob.arrayBuffer());
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(new Uint8Array(reader.result));
      } else {
        reject(new Error("Failed to read blob bytes."));
      }
    };
    reader.onerror = () =>
      reject(reader.error ?? new Error("Failed to read blob bytes."));
    reader.readAsArrayBuffer(blob);
  });
}

function parseSvgNumericDimension(raw: string | null): number | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim().toLowerCase();
  if (trimmed.endsWith("%") || trimmed === "auto") return undefined;
  const num = Number.parseFloat(trimmed.replace(/px$/i, ""));
  if (!Number.isFinite(num) || num <= 0) return undefined;
  return Math.round(num);
}

function extractSvgDimensions(
  svgMarkup: string,
): { width: number; height: number } | undefined {
  if (typeof DOMParser === "undefined") {
    return undefined;
  }
  try {
    const doc = new DOMParser().parseFromString(svgMarkup, "image/svg+xml");
    const svgEl = doc.documentElement;
    if (!svgEl || svgEl.tagName.toLowerCase() !== "svg") {
      return undefined;
    }
    const attrW = parseSvgNumericDimension(svgEl.getAttribute("width"));
    const attrH = parseSvgNumericDimension(svgEl.getAttribute("height"));
    if (attrW && attrH) {
      return { width: attrW, height: attrH };
    }
    const viewBox = svgEl.getAttribute("viewBox") ?? svgEl.getAttribute("viewbox");
    if (viewBox) {
      const parts = viewBox
        .trim()
        .split(/[\s,]+/)
        .map((n) => Number.parseFloat(n));
      if (
        parts.length === 4 &&
        Number.isFinite(parts[2]) &&
        Number.isFinite(parts[3]) &&
        parts[2] > 0 &&
        parts[3] > 0
      ) {
        return {
          width: Math.round(parts[2]),
          height: Math.round(parts[3]),
        };
      }
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function parseRasterHeaderDimensions(
  bytes: Uint8Array,
): { width: number; height: number } | undefined {
  // PNG: 8-byte signature + IHDR chunk (width at 16, height at 20, big-endian)
  if (
    bytes.length >= 24 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const width = view.getUint32(16, false);
    const height = view.getUint32(20, false);
    if (width > 0 && height > 0) {
      return { width, height };
    }
  }

  // GIF87a / GIF89a: width at 6, height at 8 (little-endian uint16)
  if (
    bytes.length >= 10 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46
  ) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const width = view.getUint16(6, true);
    const height = view.getUint16(8, true);
    if (width > 0 && height > 0) {
      return { width, height };
    }
  }

  // JPEG: 0xFF 0xD8 start, scan SOF0..SOF15 (excluding DHT 0xC4, JPG 0xC8, DAC 0xCC)
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let offset = 2;
    while (offset + 3 < bytes.length) {
      if (bytes[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = bytes[offset + 1];
      if (marker === 0xff) {
        offset += 1;
        continue;
      }
      if (marker === 0xd9 || marker === 0xda) {
        break;
      }
      if (offset + 4 > bytes.length) break;
      const segmentLength = view.getUint16(offset + 2, false);
      const isSof =
        marker >= 0xc0 &&
        marker <= 0xcf &&
        marker !== 0xc4 &&
        marker !== 0xc8 &&
        marker !== 0xcc;
      if (isSof && offset + 9 <= bytes.length) {
        const height = view.getUint16(offset + 5, false);
        const width = view.getUint16(offset + 7, false);
        if (width > 0 && height > 0) {
          return { width, height };
        }
        break;
      }
      if (segmentLength < 2) break;
      offset += 2 + segmentLength;
    }
  }

  // WebP: RIFF....WEBP
  if (
    bytes.length >= 30 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    const chunk = String.fromCharCode(
      bytes[12],
      bytes[13],
      bytes[14],
      bytes[15],
    );
    if (chunk === "VP8X" && bytes.length >= 30) {
      const width =
        1 + (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16));
      const height =
        1 + (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16));
      if (width > 0 && height > 0) return { width, height };
    }
    if (chunk === "VP8L" && bytes.length >= 25) {
      const b0 = bytes[21];
      const b1 = bytes[22];
      const b2 = bytes[23];
      const b3 = bytes[24];
      const width = 1 + (((b1 & 0x3f) << 8) | b0);
      const height =
        1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
      if (width > 0 && height > 0) return { width, height };
    }
    if (chunk === "VP8 " && bytes.length >= 30) {
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      const width = view.getUint16(26, true) & 0x3fff;
      const height = view.getUint16(28, true) & 0x3fff;
      if (width > 0 && height > 0) return { width, height };
    }
  }

  return undefined;
}

async function extractRasterDimensions(
  blob: Blob,
): Promise<{ width: number; height: number } | undefined> {
  try {
    const bytes = await readBlobBytes(blob);
    const headerDims = parseRasterHeaderDimensions(bytes);
    if (headerDims) {
      return headerDims;
    }

    const isJsdom =
      typeof navigator !== "undefined" &&
      navigator.userAgent.toLowerCase().includes("jsdom");
    if (
      isJsdom ||
      typeof Image === "undefined" ||
      typeof URL === "undefined" ||
      typeof URL.createObjectURL !== "function"
    ) {
      return undefined;
    }

    return await new Promise((resolve) => {
      const objectUrl = URL.createObjectURL(blob);
      const img = new Image();
      const timer = setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
        resolve(undefined);
      }, 300);

      img.onload = () => {
        clearTimeout(timer);
        URL.revokeObjectURL(objectUrl);
        if (img.naturalWidth > 0 && img.naturalHeight > 0) {
          resolve({
            width: Math.round(img.naturalWidth),
            height: Math.round(img.naturalHeight),
          });
        } else {
          resolve(undefined);
        }
      };
      img.onerror = () => {
        clearTimeout(timer);
        URL.revokeObjectURL(objectUrl);
        resolve(undefined);
      };
      img.src = objectUrl;
    });
  } catch {
    return undefined;
  }
}

async function blobToDownloadUrl(blob: Blob, mimeType: string): Promise<string> {
  if (typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
    return URL.createObjectURL(blob);
  }
  const bytes = await readBlobBytes(blob);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 =
    typeof btoa === "function"
      ? btoa(binary)
      : Buffer.from(bytes).toString("base64");
  return `data:${mimeType};base64,${base64}`;
}

function matchesImageRef(ref: ImageAsset | undefined, asset: MediaAsset): boolean {
  if (!ref) return false;
  return (
    ref.id === asset.id ||
    ref.src === asset.url ||
    ref.src === `idb://${asset.id}`
  );
}

function getSlotValue(
  slot: EditableImageSlot,
  site: SiteContent,
  home: HomeContent,
): ImageAsset {
  switch (slot) {
    case "site.logoDark":
      return site.logoDark;
    case "site.logoLight":
      return site.logoLight;
    case "home.hero.heroArtwork":
      return home.hero.heroArtwork;
    case "home.location.image":
      return home.location.image;
  }
}

function setSlotValue(
  slot: EditableImageSlot,
  value: ImageAsset,
  site: SiteContent,
  home: HomeContent,
): { site: SiteContent; home: HomeContent; target: "site" | "home" } {
  switch (slot) {
    case "site.logoDark":
      return {
        site: { ...site, logoDark: value },
        home,
        target: "site",
      };
    case "site.logoLight":
      return {
        site: { ...site, logoLight: value },
        home,
        target: "site",
      };
    case "home.hero.heroArtwork":
      return {
        site,
        home: { ...home, hero: { ...home.hero, heroArtwork: value } },
        target: "home",
      };
    case "home.location.image":
      return {
        site,
        home: { ...home, location: { ...home.location, image: value } },
        target: "home",
      };
  }
}

function normalizeTags(tags: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const tag of tags) {
    const trimmed = tag.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
}

function sortEvents(items: readonly EventItem[]): EventItem[] {
  return [...items].sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}

function generateApplicationId(existing: readonly RecruitmentApplication[]): string {
  let maxSeq = 0;
  for (const app of existing) {
    const match = /^APP-2026-(\d+)$/.exec(app.id);
    if (match) {
      const seq = Number.parseInt(match[1], 10);
      if (seq > maxSeq) maxSeq = seq;
    }
  }
  const candidate = `APP-2026-${String(maxSeq + 1).padStart(4, "0")}`;
  if (!existing.some((app) => app.id === candidate)) {
    return candidate;
  }
  return generateId("APP-2026");
}

function validationErrorFromZod(error: z.ZodError): ApiError {
  const first = error.issues[0];
  return new ApiError(
    422,
    "VALIDATION_ERROR",
    first?.message ?? "Validation failed",
    error.issues,
  );
}

/**
 * Creates a client-side staging/preview ServiceBundle backed by
 * bundled src/content/*.json seeds + localStorage overlays + IndexedDB file blobs.
 */
export function createMockServices(): ServiceBundle {
  function readSection<K extends ContentSectionKey>(key: K): ContentSectionMap[K] {
    return readOverlay(key, CONTENT_SCHEMAS[key], getDefaultSection(key));
  }

  function readMedia(): MediaAsset[] {
    return readOverlay("media", mediaListSchema, cloneValue(DEFAULT_MEDIA));
  }

  function readEvents(): EventItem[] {
    return readOverlay("events", eventsListSchema, cloneValue(DEFAULT_EVENTS));
  }

  function readApplications(): RecruitmentApplication[] {
    return readOverlay(
      "applications",
      applicationsListSchema,
      cloneValue(DEFAULT_ADMIN_SEED.applications),
    );
  }

  function readInquiries(): InquiryItem[] {
    return readOverlay(
      "inquiries",
      inquiriesListSchema,
      cloneValue(DEFAULT_ADMIN_SEED.inquiries),
    );
  }

  function readFaqBank(): FaqBankItem[] {
    return readOverlay(
      "faqBank",
      faqBankListSchema,
      cloneValue(DEFAULT_ADMIN_SEED.faqBank),
    );
  }

  function readSigninMemes() {
    return readOverlay(
      "signinMemes",
      signinMemesListSchema,
      cloneValue(DEFAULT_ADMIN_SEED.signinMemes),
    );
  }

  function reconcileMediaSlots(site: SiteContent, home: HomeContent): void {
    const slots = editableImageSlotSchema.options;
    const currentMedia = readMedia();
    let changed = false;

    const nextMedia = currentMedia.map((asset) => {
      let matchedSlot: EditableImageSlot | undefined;
      for (const slot of slots) {
        if (matchesImageRef(getSlotValue(slot, site, home), asset)) {
          matchedSlot = slot;
          break;
        }
      }
      if (asset.sourceSlot !== matchedSlot) {
        changed = true;
        const copy = { ...asset };
        if (matchedSlot) {
          copy.sourceSlot = matchedSlot;
        } else {
          delete copy.sourceSlot;
        }
        return copy;
      }
      return asset;
    });

    if (changed) {
      writeOverlay("media", nextMedia);
    }
  }

  function findAssetUsages(asset: MediaAsset): string[] {
    const usedBy = new Set<string>();
    const site = readSection("site");
    const home = readSection("home");
    const events = readEvents();
    const signinMemes = readSigninMemes();

    const siteRefs: Array<[string, ImageAsset]> = [
      ["site.logoDark", site.logoDark],
      ["site.logoLight", site.logoLight],
    ];
    for (const [label, ref] of siteRefs) {
      if (matchesImageRef(ref, asset)) {
        usedBy.add(label);
      }
    }

    const homeRefs: Array<[string, ImageAsset]> = [
      ["home.hero.heroArtwork", home.hero.heroArtwork],
      ["home.hero.mascotImage", home.hero.mascotImage],
      ["home.hero.patternImage", home.hero.patternImage],
      ["home.location.pinIcon", home.location.pinIcon],
      ["home.location.image", home.location.image],
    ];
    for (const [label, ref] of homeRefs) {
      if (matchesImageRef(ref, asset)) {
        usedBy.add(label);
      }
    }

    for (const event of events) {
      if (matchesImageRef(event.coverImage, asset)) {
        usedBy.add(`events.${event.id}.coverImage`);
      }
    }

    signinMemes.forEach((slide, index) => {
      if (matchesImageRef(slide, asset)) {
        usedBy.add(`admin.signinMemes[${index}]`);
      }
    });

    if (asset.sourceSlot && !usedBy.has(asset.sourceSlot)) {
      usedBy.add(asset.sourceSlot);
    }

    return Array.from(usedBy);
  }

  const content: ServiceBundle["content"] = {
    async getSection<K extends ContentSectionKey>(
      key: K,
    ): Promise<ContentSectionMap[K]> {
      const keyResult = contentSectionKeySchema.safeParse(key);
      if (!keyResult.success) {
        throw new ApiError(400, "INVALID_SECTION", `Unknown content section: ${String(key)}`);
      }
      return readSection(key);
    },

    async updateSection<K extends ContentSectionKey>(
      key: K,
      data: ContentSectionMap[K],
    ): Promise<ContentSectionMap[K]> {
      const keyResult = contentSectionKeySchema.safeParse(key);
      if (!keyResult.success) {
        throw new ApiError(400, "INVALID_SECTION", `Unknown content section: ${String(key)}`);
      }
      const parsed = CONTENT_SCHEMAS[key].safeParse(data);
      if (!parsed.success) {
        throw validationErrorFromZod(parsed.error);
      }
      writeOverlay(key, parsed.data);
      if (key === "site" || key === "home") {
        const site = key === "site" ? (parsed.data as SiteContent) : readSection("site");
        const home = key === "home" ? (parsed.data as HomeContent) : readSection("home");
        reconcileMediaSlots(site, home);
      }
      return cloneValue(parsed.data);
    },

    async resetAll(): Promise<void> {
      const defaultSite = getDefaultSection("site");
      const defaultHome = getDefaultSection("home");
      writeOverlay("site", defaultSite);
      writeOverlay("home", defaultHome);
      writeOverlay("recruitment", getDefaultSection("recruitment"));
      writeOverlay("legal", getDefaultSection("legal"));
      reconcileMediaSlots(defaultSite, defaultHome);
    },

    async exportSectionJson<K extends ContentSectionKey>(
      key: K,
    ): Promise<string> {
      const section = await content.getSection(key);
      return JSON.stringify(section, null, 2);
    },
  };

  const media: ServiceBundle["media"] = {
    async listMedia(): Promise<MediaAsset[]> {
      return readMedia();
    },

    async uploadMedia(
      input: MediaUploadRequest,
    ): Promise<UploadedMediaAsset> {
      const validation = validateImageFile(input.file);
      if (!validation.ok) {
        throw new ApiError(400, "INVALID_FILE", validation.error);
      }

      let validatedSlot: EditableImageSlot | undefined;
      if (input.sourceSlot !== undefined) {
        const slotParsed = editableImageSlotSchema.safeParse(input.sourceSlot);
        if (!slotParsed.success) {
          throw new ApiError(
            400,
            "INVALID_SLOT",
            `Unknown editable image slot: ${String(input.sourceSlot)}`,
          );
        }
        validatedSlot = slotParsed.data;
      }

      const id = generateId("media");
      let blobToStore: Blob = input.file;
      let mimeType =
        input.file.type.trim() ||
        (validation.kind === "svg" ? "image/svg+xml" : "application/octet-stream");
      let removedUnsafe = false;
      let dimensions: { width: number; height: number } | undefined;

      if (validation.kind === "svg") {
        const rawSvg = await readFileAsText(input.file);
        const result = sanitizeSvgText(rawSvg);
        if (!result.sanitized) {
          throw new ApiError(
            400,
            "INVALID_SVG",
            "Uploaded file does not contain valid SVG markup.",
          );
        }
        removedUnsafe = result.removedUnsafe;
        mimeType = "image/svg+xml";
        blobToStore = new Blob([result.sanitized], { type: mimeType });
        dimensions = extractSvgDimensions(result.sanitized);
      } else {
        dimensions = await extractRasterDimensions(blobToStore);
      }

      await putFile(id, blobToStore, {
        filename: input.file.name,
        mimeType,
      });

      const derivedTitle =
        input.title?.trim() ||
        input.file.name.replace(/\.[^/.]+$/, "").trim() ||
        input.file.name;

      const asset: MediaAsset = {
        id,
        filename: input.file.name,
        title: derivedTitle,
        ...(validatedSlot ? { sourceSlot: validatedSlot } : {}),
        mimeType,
        kind: validation.kind,
        sizeBytes: Math.max(1, blobToStore.size),
        ...(dimensions ? { width: dimensions.width, height: dimensions.height } : {}),
        url: `idb://${id}`,
        createdAt: new Date().toISOString(),
      };

      const existing = readMedia();
      writeOverlay("media", [asset, ...existing]);

      let finalAsset = asset;
      if (validatedSlot) {
        finalAsset = await media.assignMediaToSlot(asset.id, validatedSlot);
      }

      return {
        ...finalAsset,
        sanitized: removedUnsafe,
        ...(removedUnsafe
          ? {
              sanitizationNote:
                "Unsafe SVG markup was stripped before saving.",
            }
          : {}),
      };
    },

    async assignMediaToSlot(
      assetId: string,
      slot: EditableImageSlot,
    ): Promise<MediaAsset> {
      const slotParsed = editableImageSlotSchema.safeParse(slot);
      if (!slotParsed.success) {
        throw new ApiError(
          400,
          "INVALID_SLOT",
          `Unknown editable image slot: ${String(slot)}`,
        );
      }

      const currentMedia = readMedia();
      const target = currentMedia.find((m) => m.id === assetId);
      if (!target) {
        throw new ApiError(404, "MEDIA_NOT_FOUND", "Media asset not found.");
      }

      const site = readSection("site");
      const home = readSection("home");
      const imageRef: ImageAsset = {
        id: target.id,
        src: target.url,
        alt: target.title,
      };
      const updated = setSlotValue(slotParsed.data, imageRef, site, home);
      if (updated.target === "site") {
        writeOverlay("site", updated.site);
      } else {
        writeOverlay("home", updated.home);
      }

      const nextMedia = currentMedia.map((item) => {
        if (item.id === assetId) {
          return { ...item, sourceSlot: slotParsed.data };
        }
        if (item.sourceSlot === slotParsed.data) {
          const copy = { ...item };
          delete copy.sourceSlot;
          return copy;
        }
        return item;
      });
      writeOverlay("media", nextMedia);

      return nextMedia.find((item) => item.id === assetId)!;
    },

    async deleteMedia(assetId: string): Promise<void> {
      const currentMedia = readMedia();
      const target = currentMedia.find((m) => m.id === assetId);
      if (!target) {
        throw new ApiError(404, "MEDIA_NOT_FOUND", "Media asset not found.");
      }

      const usedBy = findAssetUsages(target);
      if (usedBy.length > 0) {
        throw new ApiError(409, "ASSET_IN_USE", "Asset is currently in use", {
          usedBy,
        });
      }

      const nextMedia = currentMedia.filter((m) => m.id !== assetId);
      writeOverlay("media", nextMedia);

      await deleteFile(assetId);
      if (target.url.startsWith("idb://")) {
        const urlId = target.url.slice("idb://".length);
        if (urlId && urlId !== assetId) {
          await deleteFile(urlId);
        }
      }
    },
  };

  const events: ServiceBundle["events"] = {
    async listEvents(filters?: EventListFilters): Promise<EventItem[]> {
      let items = readEvents();
      if (filters?.published !== undefined) {
        const targetStatus = filters.published ? "Published" : "Draft";
        items = items.filter((item) => item.status === targetStatus);
      }
      if (filters?.showOnHome !== undefined) {
        items = items.filter((item) => item.showOnHome === filters.showOnHome);
      }
      return sortEvents(items);
    },

    async createEvent(
      input: EventUpsertInput,
      coverFile?: File,
    ): Promise<EventItem> {
      const parsedInput = eventUpsertInputSchema.safeParse(input);
      if (!parsedInput.success) {
        throw validationErrorFromZod(parsedInput.error);
      }

      let coverImage = parsedInput.data.coverImage;
      if (coverFile) {
        const uploaded = await media.uploadMedia({
          file: coverFile,
          title: parsedInput.data.title,
        });
        coverImage = {
          id: uploaded.id,
          src: uploaded.url,
          alt: parsedInput.data.coverImage?.alt || uploaded.title,
        };
      }

      const created = eventItemSchema.parse({
        ...parsedInput.data,
        ...(coverImage ? { coverImage } : {}),
        id: generateId("evt"),
        updatedAt: new Date().toISOString(),
      });

      const current = readEvents();
      writeOverlay("events", sortEvents([...current, created]));
      return created;
    },

    async updateEvent(
      id: string,
      input: EventUpdateInput,
      coverFile?: File,
    ): Promise<EventItem> {
      const current = readEvents();
      const index = current.findIndex((item) => item.id === id);
      if (index === -1) {
        throw new ApiError(404, "EVENT_NOT_FOUND", "Event item not found.");
      }

      const existing = current[index];
      const hasCoverProp = "coverImage" in input;
      let nextCoverImage: ImageAsset | undefined = hasCoverProp
        ? (input.coverImage ?? undefined)
        : existing.coverImage;

      if (coverFile) {
        const uploaded = await media.uploadMedia({
          file: coverFile,
          title: input.title ?? existing.title,
        });
        nextCoverImage = {
          id: uploaded.id,
          src: uploaded.url,
          alt: input.coverImage?.alt || uploaded.title,
        };
      }

      const candidate = {
        ...existing,
        ...input,
        id: existing.id,
        updatedAt: new Date().toISOString(),
        coverImage: nextCoverImage,
      };
      if (nextCoverImage === undefined) {
        delete candidate.coverImage;
      }

      const parsed = eventItemSchema.safeParse(candidate);
      if (!parsed.success) {
        throw validationErrorFromZod(parsed.error);
      }

      const nextList = [...current];
      nextList[index] = parsed.data;
      writeOverlay("events", sortEvents(nextList));
      return parsed.data;
    },

    async deleteEvent(id: string): Promise<void> {
      const current = readEvents();
      if (!current.some((item) => item.id === id)) {
        throw new ApiError(404, "EVENT_NOT_FOUND", "Event item not found.");
      }
      writeOverlay(
        "events",
        current.filter((item) => item.id !== id),
      );
    },
  };

  const auth: ServiceBundle["auth"] = {
    async login(input: LoginInput): Promise<AdminSession> {
      const parsed = loginInputSchema.safeParse(input);
      if (!parsed.success) {
        throw validationErrorFromZod(parsed.error);
      }

      const session: AdminSession = adminSessionSchema.parse({
        email: parsed.data.email.trim(),
        authenticated: true,
        loggedInAt: new Date().toISOString(),
      });

      const storage = getSafeSessionStorage();
      if (storage) {
        storage.setItem(ADMIN_SESSION_STORAGE_KEY, JSON.stringify(session));
      }

      return session;
    },

    async logout(): Promise<void> {
      const storage = getSafeSessionStorage();
      if (storage) {
        storage.removeItem(ADMIN_SESSION_STORAGE_KEY);
      }
    },

    async getSession(): Promise<AdminSession | null> {
      const storage = getSafeSessionStorage();
      if (!storage) {
        return null;
      }
      try {
        const raw = storage.getItem(ADMIN_SESSION_STORAGE_KEY);
        if (!raw) return null;
        const parsed = adminSessionSchema.safeParse(JSON.parse(raw));
        if (!parsed.success || !parsed.data.authenticated) {
          return null;
        }
        return parsed.data;
      } catch {
        return null;
      }
    },
  };

  const recruitment: ServiceBundle["recruitment"] = {
    async listApplications(): Promise<RecruitmentApplication[]> {
      return readApplications();
    },

    async submitApplication(
      input: RecruitmentSubmitInput,
      cvFile?: File,
    ): Promise<RecruitmentApplication> {
      const parsed = recruitmentSubmitInputSchema.safeParse(input);
      if (!parsed.success) {
        throw validationErrorFromZod(parsed.error);
      }

      let cvMeta = parsed.data.cv;
      if (cvFile) {
        const cvCheck = validateCvFile(cvFile);
        if (!cvCheck.ok) {
          throw new ApiError(400, "INVALID_FILE", cvCheck.error);
        }
        const fileId = generateId("cv");
        const mimeType =
          cvFile.type.trim() ||
          (cvFile.name.toLowerCase().endsWith(".docx")
            ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            : "application/pdf");

        await putFile(fileId, cvFile, {
          filename: cvFile.name,
          mimeType,
        });

        cvMeta = {
          fileRef: `idb://${fileId}`,
          filename: cvFile.name,
          mimeType,
          sizeBytes: Math.max(1, cvFile.size),
        };
      }

      const existing = readApplications();
      const created = recruitmentApplicationSchema.parse({
        ...parsed.data,
        ...(cvMeta ? { cv: cvMeta } : {}),
        id: generateApplicationId(existing),
        createdAt: new Date().toISOString(),
        status: "Pending",
      });

      writeOverlay("applications", [created, ...existing]);
      return created;
    },

    async updateStatus(
      id: string,
      status: ApplicationStatus,
    ): Promise<RecruitmentApplication> {
      const statusParsed = applicationStatusSchema.safeParse(status);
      if (!statusParsed.success) {
        throw validationErrorFromZod(statusParsed.error);
      }

      const existing = readApplications();
      const index = existing.findIndex((app) => app.id === id);
      if (index === -1) {
        throw new ApiError(
          404,
          "APPLICATION_NOT_FOUND",
          "Recruitment application not found.",
        );
      }

      const updated: RecruitmentApplication = {
        ...existing[index],
        status: statusParsed.data,
      };
      const next = [...existing];
      next[index] = updated;
      writeOverlay("applications", next);
      return updated;
    },

    async getCvDownloadUrl(id: string): Promise<CvDownloadInfo> {
      const existing = readApplications();
      const app = existing.find((item) => item.id === id);
      if (!app) {
        throw new ApiError(
          404,
          "APPLICATION_NOT_FOUND",
          "Recruitment application not found.",
        );
      }
      if (!app.cv) {
        throw new ApiError(
          404,
          "CV_NOT_FOUND",
          "No CV file was uploaded with this application.",
        );
      }

      if (app.cv.fileRef.startsWith("idb://")) {
        const fileId = app.cv.fileRef.slice("idb://".length);
        const stored = await getFileBlob(fileId);
        if (stored) {
          return {
            url: await blobToDownloadUrl(stored.blob, stored.mimeType),
            filename: stored.filename,
            mimeType: stored.mimeType,
          };
        }

        // Clean fallback if a seeded mock record references a sample fileRef not yet written to IDB.
        const fallbackBlob = new Blob(
          [
            `MUICT Dev Club Sample CV Placeholder\nApplicant: ${app.personal.firstName} ${app.personal.lastName} (${app.personal.studentId})\nFilename: ${app.cv.filename}\n`,
          ],
          { type: app.cv.mimeType },
        );
        return {
          url: await blobToDownloadUrl(fallbackBlob, app.cv.mimeType),
          filename: app.cv.filename,
          mimeType: app.cv.mimeType,
        };
      }

      return {
        url: app.cv.fileRef,
        filename: app.cv.filename,
        mimeType: app.cv.mimeType,
      };
    },
  };

  const inquiries: ServiceBundle["inquiries"] = {
    async listInquiries(): Promise<InquiryItem[]> {
      return readInquiries();
    },

    async submitInquiry(input: InquiryCreateInput): Promise<InquiryItem> {
      const parsed = inquiryCreateInputSchema.safeParse(input);
      if (!parsed.success) {
        throw validationErrorFromZod(parsed.error);
      }

      const existing = readInquiries();
      const created = inquiryItemSchema.parse({
        id: generateId("inq"),
        question: parsed.data.question.trim(),
        senderEmail: parsed.data.senderEmail.trim(),
        category: parsed.data.category.trim(),
        tags: [parsed.data.category.trim()],
        status: "Unanswered",
        createdAt: new Date().toISOString(),
      });

      writeOverlay("inquiries", [created, ...existing]);
      return created;
    },

    async replyInquiry(
      id: string,
      reply: ReplyInquiryInput,
    ): Promise<InquiryItem> {
      const parsed = replyInputSchema.safeParse({
        body: reply.body,
        markAnswered: reply.markAnswered,
      });
      if (!parsed.success) {
        throw validationErrorFromZod(parsed.error);
      }

      const existing = readInquiries();
      const index = existing.findIndex((item) => item.id === id);
      if (index === -1) {
        throw new ApiError(404, "INQUIRY_NOT_FOUND", "Inquiry not found.");
      }

      const session = await auth.getSession();
      const sentBy = reply.sentBy?.trim() || session?.email || "admin@example.com";
      const target = existing[index];
      const updated: InquiryItem = {
        ...target,
        status: parsed.data.markAnswered ? "Answered" : target.status,
        reply: {
          body: parsed.data.body.trim(),
          sentAt: new Date().toISOString(),
          sentBy,
        },
      };

      const next = [...existing];
      next[index] = updated;
      writeOverlay("inquiries", next);
      return updated;
    },

    async updateTags(id: string, tags: string[]): Promise<InquiryItem> {
      const existing = readInquiries();
      const index = existing.findIndex((item) => item.id === id);
      if (index === -1) {
        throw new ApiError(404, "INQUIRY_NOT_FOUND", "Inquiry not found.");
      }

      const updated: InquiryItem = {
        ...existing[index],
        tags: normalizeTags(tags),
      };
      const next = [...existing];
      next[index] = updated;
      writeOverlay("inquiries", next);
      return updated;
    },

    async listFaqBank(): Promise<FaqBankItem[]> {
      return readFaqBank();
    },

    async createFaqBankItem(input: FaqBankCreateInput): Promise<FaqBankItem> {
      const now = new Date().toISOString();
      const candidate = {
        id: generateId("faqb"),
        question: input.question.trim(),
        answer: input.answer.trim(),
        category: input.category.trim(),
        tags: normalizeTags(input.tags ?? []),
        createdAt: now,
        updatedAt: now,
        promotedToHome: input.promotedToHome ?? false,
      };
      const parsed = faqBankItemSchema.safeParse(candidate);
      if (!parsed.success) {
        throw validationErrorFromZod(parsed.error);
      }

      const existing = readFaqBank();
      writeOverlay("faqBank", [parsed.data, ...existing]);
      return parsed.data;
    },

    async updateFaqBankItem(
      id: string,
      input: FaqBankUpdateInput,
    ): Promise<FaqBankItem> {
      const existing = readFaqBank();
      const index = existing.findIndex((item) => item.id === id);
      if (index === -1) {
        throw new ApiError(
          404,
          "FAQ_BANK_ITEM_NOT_FOUND",
          "FAQ Bank item not found.",
        );
      }

      const current = existing[index];
      const candidate = {
        ...current,
        ...(input.question !== undefined ? { question: input.question.trim() } : {}),
        ...(input.answer !== undefined ? { answer: input.answer.trim() } : {}),
        ...(input.category !== undefined ? { category: input.category.trim() } : {}),
        ...(input.tags !== undefined ? { tags: normalizeTags(input.tags) } : {}),
        ...(input.promotedToHome !== undefined
          ? { promotedToHome: input.promotedToHome }
          : {}),
        updatedAt: new Date().toISOString(),
      };

      const parsed = faqBankItemSchema.safeParse(candidate);
      if (!parsed.success) {
        throw validationErrorFromZod(parsed.error);
      }

      const next = [...existing];
      next[index] = parsed.data;
      writeOverlay("faqBank", next);
      return parsed.data;
    },

    async deleteFaqBankItem(id: string): Promise<void> {
      const existing = readFaqBank();
      if (!existing.some((item) => item.id === id)) {
        throw new ApiError(
          404,
          "FAQ_BANK_ITEM_NOT_FOUND",
          "FAQ Bank item not found.",
        );
      }
      writeOverlay(
        "faqBank",
        existing.filter((item) => item.id !== id),
      );
    },

    async copyFaqBankToHome(faqBankId: string): Promise<FaqItem> {
      const bank = readFaqBank();
      const bankIndex = bank.findIndex((item) => item.id === faqBankId);
      if (bankIndex === -1) {
        throw new ApiError(
          404,
          "FAQ_BANK_ITEM_NOT_FOUND",
          "FAQ Bank item not found.",
        );
      }

      const bankItem = bank[bankIndex];
      const home = await content.getSection("home");
      const newFaqItem: FaqItem = {
        id: generateId("faq"),
        question: bankItem.question,
        answer: bankItem.answer,
      };

      await content.updateSection("home", {
        ...home,
        faq: {
          ...home.faq,
          items: [...home.faq.items, newFaqItem],
        },
      });

      const nextBank = [...bank];
      nextBank[bankIndex] = {
        ...bankItem,
        promotedToHome: true,
        updatedAt: new Date().toISOString(),
      };
      writeOverlay("faqBank", nextBank);

      return newFaqItem;
    },
  };

  return {
    content,
    media,
    events,
    recruitment,
    inquiries,
    auth,
  };
}
