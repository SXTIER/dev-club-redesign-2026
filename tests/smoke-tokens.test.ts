import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("2026 CI design tokens", () => {
  it("defines required primary, neutral, and semantic tokens in globals.css", () => {
    const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");
    for (const hex of [
      "#0038E1",
      "#E25BE9",
      "#A9E041",
      "#1C1B1F",
      "#F8FAFC",
      "#E7FDA7",
      "#FFF194",
      "#FAAF98",
    ]) {
      expect(css.toUpperCase()).toContain(hex);
    }
  });
});
