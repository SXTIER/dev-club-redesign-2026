import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import siteJson from "@/content/site.json";
import homeJson from "@/content/home.json";
import eventsJson from "@/content/events.json";
import recruitmentJson from "@/content/recruitment.json";
import legalJson from "@/content/legal.json";
import mediaJson from "@/content/media.json";
import adminSeedJson from "@/content/admin-seed.json";
import {
  siteContentSchema,
  homeContentSchema,
  recruitmentContentSchema,
  legalContentSchema,
} from "@/lib/types/content";
import { eventsListSchema } from "@/lib/types/events";
import { mediaListSchema } from "@/lib/types/media";
import { adminSeedSchema } from "@/lib/types/adminSeed";

describe("Modular src/content/*.json schemas & local Figma assets", () => {
  it("validates all 7 JSON files against Zod schemas", () => {
    expect(() => siteContentSchema.parse(siteJson)).not.toThrow();

    const home = homeContentSchema.parse(homeJson);
    expect(home.whyUs.cards).toHaveLength(3);
    expect(home.teams.items).toHaveLength(5);
    expect(home.faq.items.length).toBeGreaterThanOrEqual(2);

    const events = eventsListSchema.parse(eventsJson);
    const homeEvents = events.filter((e) => e.status === "Published" && e.showOnHome);
    expect(homeEvents).toHaveLength(5);
    expect(homeEvents.some((e) => e.category === "Event")).toBe(true);
    expect(homeEvents.some((e) => e.category === "News")).toBe(true);
    expect(events.some((e) => e.status === "Draft")).toBe(true);
    expect(JSON.stringify(events)).not.toContain("Help Dogs");

    const rec = recruitmentContentSchema.parse(recruitmentJson);
    expect(rec.projectsTeamRoles).toHaveLength(8);
    expect(rec.marketingTeamRoles).toHaveLength(4);
    expect(rec.programs).toEqual(["ICT", "DST"]);
    expect(rec.years).toEqual(["1", "2", "3", "4"]);

    const legal = legalContentSchema.parse(legalJson);
    expect(legal.privacyPolicy.en.sections.length).toBeGreaterThan(0);
    expect(legal.privacyPolicy.th.sections.length).toBeGreaterThan(0);
    expect(legal.termsOfUse.en.sections.length).toBeGreaterThan(0);
    expect(legal.termsOfUse.th.sections.length).toBeGreaterThan(0);
    expect(legal.acknowledgement.en.sections.length).toBeGreaterThan(0);
    expect(legal.acknowledgement.th.sections.length).toBeGreaterThan(0);

    const media = mediaListSchema.parse(mediaJson);
    expect(media.length).toBeGreaterThanOrEqual(10);

    const seed = adminSeedSchema.parse(adminSeedJson);
    expect(seed.applications.some((a) => a.status === "Pending")).toBe(true);
    expect(seed.applications.some((a) => a.status === "Accepted")).toBe(true);
    expect(seed.applications.some((a) => a.status === "Rejected")).toBe(true);
    expect(seed.inquiries.some((i) => i.status === "Unanswered")).toBe(true);
    expect(seed.inquiries.some((i) => i.status === "Answered")).toBe(true);
    expect(seed.faqBank.length).toBeGreaterThan(0);
    expect(seed.signinMemes.length).toBeGreaterThanOrEqual(2);
  });

  it("ensures every /images/figma/* path in JSON points to a non-empty local file and zero temp Figma URLs exist", () => {
    const raw = JSON.stringify([siteJson, homeJson, eventsJson, mediaJson, adminSeedJson]);
    expect(raw).not.toContain("figma.com/api/mcp/asset");
    const matches = raw.match(/\/images\/figma\/[^"]+/g) ?? [];
    expect(matches.length).toBeGreaterThan(0);
    for (const rel of matches) {
      const full = resolve(process.cwd(), "public", rel.slice(1));
      expect(existsSync(full), `Missing asset: ${rel}`).toBe(true);
      expect(statSync(full).size, `Empty asset: ${rel}`).toBeGreaterThan(0);
    }
  });

  it("includes an unused asset in media.json for safe deletion testing and accurate byte sizes", () => {
    const media = mediaListSchema.parse(mediaJson);
    const usedUrls = new Set<string>();
    const collectRefs = JSON.stringify([siteJson, homeJson, eventsJson, adminSeedJson]);
    for (const m of media) {
      const full = resolve(process.cwd(), "public", m.url.slice(1));
      expect(statSync(full).size).toBe(m.sizeBytes);
      if (collectRefs.includes(m.url)) {
        usedUrls.add(m.url);
      }
    }
    const unused = media.filter((m) => !usedUrls.has(m.url) && !m.sourceSlot);
    expect(unused.length).toBeGreaterThanOrEqual(1);
  });
});
