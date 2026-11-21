export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export type ImageValidationResult =
  | { ok: true; kind: "image" | "svg" }
  | { ok: false; error: string };

export type CvValidationResult =
  | { ok: true }
  | { ok: false; error: string };

export interface SanitizedSvgResult {
  sanitized: string;
  removedUnsafe: boolean;
}

const IMAGE_MIME_BY_EXT: Record<string, readonly string[]> = {
  ".png": ["image/png"],
  ".jpg": ["image/jpeg", "image/jpg"],
  ".jpeg": ["image/jpeg", "image/jpg"],
  ".webp": ["image/webp"],
  ".gif": ["image/gif"],
  ".svg": ["image/svg+xml"],
};

const CV_MIME_BY_EXT: Record<string, readonly string[]> = {
  ".pdf": ["application/pdf"],
  ".docx": [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
};

const UNSAFE_SVG_TAGS = new Set([
  "script",
  "foreignobject",
  "iframe",
  "object",
  "embed",
]);

const URI_ATTRS = new Set(["href", "xlink:href", "src"]);

function getLowercaseExtension(filename: string): string {
  const trimmed = filename.trim().toLowerCase();
  const lastDot = trimmed.lastIndexOf(".");
  if (lastDot <= 0) return "";
  return trimmed.slice(lastDot);
}

function isUnsafeUri(value: string): boolean {
  const normalized = value.replace(/[\u0000-\u0020\s]+/g, "").toLowerCase();
  return (
    normalized.startsWith("javascript:") ||
    normalized.startsWith("data:text/html") ||
    normalized.startsWith("vbscript:")
  );
}

function validateFileWithMap(
  file: File,
  mimeByExt: Record<string, readonly string[]>,
  kindLabel: string,
  allowedExtensionsLabel: string
): { ok: true; ext: string } | { ok: false; error: string } {
  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      error: `${kindLabel} exceeds the 10 MB maximum upload size.`,
    };
  }

  const ext = getLowercaseExtension(file.name);
  const allowedMimes = mimeByExt[ext];
  if (!allowedMimes) {
    return {
      ok: false,
      error: `Unsupported ${kindLabel.toLowerCase()} extension. Allowed: ${allowedExtensionsLabel}.`,
    };
  }

  const mime = file.type.trim().toLowerCase();
  if (!allowedMimes.includes(mime)) {
    return {
      ok: false,
      error: `${kindLabel} MIME type (${mime || "unknown"}) does not match ${ext}.`,
    };
  }

  return { ok: true, ext };
}

export function validateImageFile(file: File): ImageValidationResult {
  const result = validateFileWithMap(
    file,
    IMAGE_MIME_BY_EXT,
    "Image file",
    ".png, .jpg, .jpeg, .webp, .gif, .svg"
  );
  if (!result.ok) {
    return result;
  }

  return {
    ok: true,
    kind: result.ext === ".svg" ? "svg" : "image",
  };
}

export function validateCvFile(file: File): CvValidationResult {
  const result = validateFileWithMap(
    file,
    CV_MIME_BY_EXT,
    "CV file",
    ".pdf, .docx"
  );
  if (!result.ok) {
    return result;
  }

  return { ok: true };
}

function parseSvgRoot(rawSvg: string): Element | null {
  if (typeof DOMParser === "undefined") {
    return null;
  }

  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(rawSvg, "image/svg+xml");
  const hasParserError = xmlDoc.querySelector("parsererror") !== null;

  if (!hasParserError && xmlDoc.documentElement?.tagName.toLowerCase() === "svg") {
    return xmlDoc.documentElement;
  }

  const htmlDoc = parser.parseFromString(rawSvg, "text/html");
  return htmlDoc.body.querySelector("svg");
}

export function sanitizeSvgText(rawSvg: string): SanitizedSvgResult {
  const svgRoot = parseSvgRoot(rawSvg);
  if (!svgRoot) {
    return { sanitized: "", removedUnsafe: rawSvg.trim().length > 0 };
  }

  let removedUnsafe = false;
  const elements = [svgRoot, ...Array.from(svgRoot.querySelectorAll("*"))];

  for (const el of elements) {
    if (!el.isConnected && el !== svgRoot) {
      continue;
    }

    const tagName = el.tagName.toLowerCase();
    if (UNSAFE_SVG_TAGS.has(tagName)) {
      el.remove();
      removedUnsafe = true;
      continue;
    }

    for (const attr of Array.from(el.attributes)) {
      const nameLower = attr.name.toLowerCase();
      const localLower = attr.localName?.toLowerCase() ?? nameLower;

      if (nameLower.startsWith("on")) {
        el.removeAttribute(attr.name);
        removedUnsafe = true;
        continue;
      }

      if (URI_ATTRS.has(nameLower) || localLower === "href" || localLower === "src") {
        if (isUnsafeUri(attr.value)) {
          el.removeAttribute(attr.name);
          removedUnsafe = true;
        }
      }
    }
  }

  const sanitized = new XMLSerializer().serializeToString(svgRoot);
  return { sanitized, removedUnsafe };
}
