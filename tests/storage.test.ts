import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  MAX_UPLOAD_BYTES,
  sanitizeSvgText,
  validateCvFile,
  validateImageFile,
} from "@/lib/storage/svgSanitizer";
import {
  clearAllFiles,
  deleteFile,
  getFileBlob,
  putFile,
} from "@/lib/storage/indexedDbFiles";
import {
  clearAllOverlays,
  findIdbRefs,
  readOverlay,
  writeOverlay,
} from "@/lib/storage/localOverlay";

describe("File safety, SVG sanitization, IndexedDB, and localOverlay", () => {
  beforeEach(async () => {
    localStorage.clear();
    clearAllOverlays();
    await clearAllFiles();
  });

  describe("sanitizeSvgText", () => {
    it("strips script, foreignObject, on* handlers, and javascript: hrefs from SVG (Review Focus #1)", () => {
      const dirty = `<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>evil()</script><foreignObject><div>x</div></foreignObject><a href="javascript:alert(2)"><rect width="10" height="10" onclick="boom()"/></a></svg>`;
      const { sanitized, removedUnsafe } = sanitizeSvgText(dirty);
      expect(removedUnsafe).toBe(true);
      expect(sanitized.toLowerCase()).not.toContain("<script");
      expect(sanitized.toLowerCase()).not.toContain("foreignobject");
      expect(sanitized.toLowerCase()).not.toContain("onload");
      expect(sanitized.toLowerCase()).not.toContain("onclick");
      expect(sanitized.toLowerCase()).not.toContain("javascript:");
    });

    it("strips iframe, object, embed, and case/whitespace-obfuscated javascript: or data:text/html URIs", () => {
      const dirty = [
        `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">`,
        `<iframe src="https://evil.example"/>`,
        `<object data="evil.swf"/>`,
        `<embed src="evil.swf"/>`,
        `<a href="  JaVaScRiPt\t:\nalert(1)"><circle cx="5" cy="5" r="4" OnMouseOver="hack()"/></a>`,
        `<use xlink:href=" \n dAtA:text/html;base64,PHNjcmlwdD4="/>`,
        `<image src="JAVASCRIPT:void(0)"/>`,
        `</svg>`,
      ].join("");

      const { sanitized, removedUnsafe } = sanitizeSvgText(dirty);
      expect(removedUnsafe).toBe(true);
      const lower = sanitized.toLowerCase();
      expect(lower).not.toContain("<iframe");
      expect(lower).not.toContain("<object");
      expect(lower).not.toContain("<embed");
      expect(lower).not.toContain("onmouseover");
      expect(lower).not.toContain("javascript");
      expect(lower).not.toContain("data:text/html");
      expect(lower).toContain("<circle");
    });

    it("preserves safe SVG markup and reports removedUnsafe as false", () => {
      const clean = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0h24v24H0z" fill="#0B5ED7"/></svg>`;
      const { sanitized, removedUnsafe } = sanitizeSvgText(clean);
      expect(removedUnsafe).toBe(false);
      expect(sanitized).toContain("<svg");
      expect(sanitized).toContain("<path");
      expect(sanitized).toContain("#0B5ED7");
    });
  });

  describe("validateImageFile & validateCvFile", () => {
    it("rejects files exceeding 10 MB or disallowed MIME/extension (Review Focus #2)", () => {
      const tooBig = new File([new Uint8Array(MAX_UPLOAD_BYTES + 1)], "huge.png", {
        type: "image/png",
      });
      expect(validateImageFile(tooBig).ok).toBe(false);

      const badCv = new File(["binary"], "virus.exe", {
        type: "application/x-msdownload",
      });
      expect(validateCvFile(badCv).ok).toBe(false);

      const okPdf = new File(["%PDF-1.4"], "resume.pdf", {
        type: "application/pdf",
      });
      expect(validateCvFile(okPdf).ok).toBe(true);
    });

    it("validates allowed image and SVG extensions + MIME types and rejects mismatches", () => {
      const png = new File(["png"], "photo.PNG", { type: "image/png" });
      expect(validateImageFile(png)).toEqual({ ok: true, kind: "image" });

      const jpg = new File(["jpg"], "pic.jpeg", { type: "image/jpeg" });
      expect(validateImageFile(jpg)).toEqual({ ok: true, kind: "image" });

      const webp = new File(["webp"], "pic.webp", { type: "image/webp" });
      expect(validateImageFile(webp)).toEqual({ ok: true, kind: "image" });

      const gif = new File(["gif"], "anim.gif", { type: "image/gif" });
      expect(validateImageFile(gif)).toEqual({ ok: true, kind: "image" });

      const svg = new File(["<svg/>"], "logo.svg", { type: "image/svg+xml" });
      expect(validateImageFile(svg)).toEqual({ ok: true, kind: "svg" });

      const spoofedExt = new File(["<html/>"], "evil.png", { type: "text/html" });
      expect(validateImageFile(spoofedExt).ok).toBe(false);

      const spoofedMime = new File(["exe"], "evil.exe", { type: "image/png" });
      expect(validateImageFile(spoofedMime).ok).toBe(false);

      const mismatchedSvg = new File(["<svg/>"], "logo.png", {
        type: "image/svg+xml",
      });
      expect(validateImageFile(mismatchedSvg).ok).toBe(false);
    });

    it("validates DOCX files and rejects oversized or mismatched CV files", () => {
      const okDocx = new File(["PK"], "cv.docx", {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      expect(validateCvFile(okDocx)).toEqual({ ok: true });

      const tooBigCv = new File([new Uint8Array(MAX_UPLOAD_BYTES + 1)], "cv.pdf", {
        type: "application/pdf",
      });
      expect(validateCvFile(tooBigCv).ok).toBe(false);

      const spoofedCv = new File(["hello"], "cv.pdf", { type: "text/html" });
      expect(validateCvFile(spoofedCv).ok).toBe(false);

      const badExtCv = new File(["%PDF"], "cv.txt", { type: "application/pdf" });
      expect(validateCvFile(badExtCv).ok).toBe(false);
    });
  });

  describe("indexedDbFiles", () => {
    it("stores, reads, and deletes blobs in IndexedDB", async () => {
      const blob = new Blob(["hello pdf"], { type: "application/pdf" });
      await putFile("cv-1", blob, {
        filename: "resume.pdf",
        mimeType: "application/pdf",
      });
      const loaded = await getFileBlob("cv-1");
      expect(loaded?.filename).toBe("resume.pdf");
      expect(loaded?.mimeType).toBe("application/pdf");
      expect(loaded?.blob.size).toBe(blob.size);
      const loadedText = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsText(loaded!.blob);
      });
      expect(loadedText).toBe("hello pdf");
      await deleteFile("cv-1");
      expect(await getFileBlob("cv-1")).toBeNull();
    });

    it("clears all stored files and handles SSR cleanly", async () => {
      await putFile("a", new Blob(["1"]), { filename: "a.png", mimeType: "image/png" });
      await putFile("b", new Blob(["2"]), { filename: "b.png", mimeType: "image/png" });
      await clearAllFiles();
      expect(await getFileBlob("a")).toBeNull();
      expect(await getFileBlob("b")).toBeNull();

      vi.stubGlobal("indexedDB", undefined);
      try {
        await expect(
          putFile("ssr", new Blob(["x"]), { filename: "x.png", mimeType: "image/png" }),
        ).resolves.toBeUndefined();
        await expect(getFileBlob("ssr")).resolves.toBeNull();
        await expect(deleteFile("ssr")).resolves.toBeUndefined();
        await expect(clearAllFiles()).resolves.toBeUndefined();
      } finally {
        vi.unstubAllGlobals();
      }
    });
  });

  describe("localOverlay", () => {
    it("falls back cleanly to default JSON when localStorage is corrupt (Review Focus #4)", () => {
      const schema = z.object({ title: z.string() });
      localStorage.setItem("muict_devclub_v1_home", "{not-valid-json");
      expect(readOverlay("home", schema, { title: "Default" })).toEqual({
        title: "Default",
      });

      localStorage.setItem(
        "muict_devclub_v1_home",
        JSON.stringify({ wrongKey: 123 }),
      );
      expect(readOverlay("home", schema, { title: "Default" })).toEqual({
        title: "Default",
      });

      writeOverlay("home", { title: "Updated" });
      expect(localStorage.getItem("muict_devclub_v1_home")).toBe(
        JSON.stringify({ title: "Updated" }),
      );
      expect(readOverlay("home", schema, { title: "Default" })).toEqual({
        title: "Updated",
      });
    });

    it("only clears muict_devclub_v1_ keys on clearAllOverlays and is SSR-safe", () => {
      localStorage.setItem("unrelated_key", "keep");
      writeOverlay("home", { title: "Hello" });
      clearAllOverlays();
      expect(localStorage.getItem("muict_devclub_v1_home")).toBeNull();
      expect(localStorage.getItem("unrelated_key")).toBe("keep");

      const schema = z.object({ title: z.string() });
      vi.stubGlobal("localStorage", undefined);
      try {
        expect(readOverlay("home", schema, { title: "SSR" })).toEqual({
          title: "SSR",
        });
        expect(() => writeOverlay("home", { title: "SSR" })).not.toThrow();
        expect(() => clearAllOverlays()).not.toThrow();
      } finally {
        vi.unstubAllGlobals();
      }
    });

    it("detects and deduplicates idb:// image references inside nested JSON objects and arrays", () => {
      expect(
        findIdbRefs({
          hero: { src: "idb://asset-1" },
          gallery: [
            { image: "idb://asset-2" },
            { image: "idb://asset-1" },
            "idb://asset-3",
          ],
          other: "/images/figma/a.png",
          empty: null,
          count: 42,
        }),
      ).toEqual(["asset-1", "asset-2", "asset-3"]);
    });
  });
});
