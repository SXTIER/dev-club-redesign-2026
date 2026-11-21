import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMockServices } from "@/lib/services/mockAdapter";
import { createHttpServices } from "@/lib/services/httpAdapter";
import { ApiError } from "@/lib/services/contracts";
import { AppDataProvider, useAppData } from "@/context/AppDataContext";
import { clearAllOverlays } from "@/lib/storage/localOverlay";
import { clearAllFiles, getFileBlob } from "@/lib/storage/indexedDbFiles";

function readBlobText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("FileReader error"));
    reader.readAsText(blob);
  });
}

describe("Service layer (MockAdapter & HttpAdapter)", () => {
  beforeEach(async () => {
    clearAllOverlays();
    await clearAllFiles();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("blocks deleting a MediaAsset currently referenced by a site slot, event cover, or signin meme with 409 ASSET_IN_USE (Review Focus #3)", async () => {
    const svc = createMockServices();
    const media = await svc.media.listMedia();

    const heroAsset = media.find((m) => m.sourceSlot === "home.hero.heroArtwork");
    expect(heroAsset).toBeDefined();
    await expect(svc.media.deleteMedia(heroAsset!.id)).rejects.toMatchObject({
      status: 409,
      code: "ASSET_IN_USE",
    });

    // Referenced only by admin-seed.json signinMemes[]
    const memeAsset = media.find((m) => m.id === "media-signin-meme-1");
    expect(memeAsset).toBeDefined();
    await expect(svc.media.deleteMedia(memeAsset!.id)).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof ApiError &&
        err.status === 409 &&
        err.code === "ASSET_IN_USE" &&
        Array.isArray((err.details as { usedBy?: unknown })?.usedBy) &&
        ((err.details as { usedBy: string[] }).usedBy.length > 0),
    );

    // Unused seeded asset can be deleted safely
    const unused = media.find((m) => m.id === "media-devclub-white-mark");
    expect(unused).toBeDefined();
    await expect(svc.media.deleteMedia(unused!.id)).resolves.toBeUndefined();
    const afterDelete = await svc.media.listMedia();
    expect(afterDelete.some((m) => m.id === "media-devclub-white-mark")).toBe(false);
  });

  it("sanitizes unsafe SVG uploads, stores idb:// blobs in IndexedDB, assigns slots, and allows deleting replaced assets", async () => {
    const svc = createMockServices();
    const dirtySvg = new File(
      [
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" onload="alert(1)"><script>evil()</script><a href="javascript:alert(2)"><rect width="24" height="24"/></a></svg>`,
      ],
      "custom-hero.svg",
      { type: "image/svg+xml" },
    );

    const uploaded = await svc.media.uploadMedia({
      file: dirtySvg,
      title: "Custom Hero Graphic",
      sourceSlot: "home.hero.heroArtwork",
    });

    expect(uploaded.url).toBe(`idb://${uploaded.id}`);
    expect(uploaded.kind).toBe("svg");
    expect(uploaded.sanitized).toBe(true);
    expect(uploaded.sourceSlot).toBe("home.hero.heroArtwork");

    const stored = await getFileBlob(uploaded.id);
    expect(stored).not.toBeNull();
    const storedText = await readBlobText(stored!.blob);
    expect(storedText.toLowerCase()).not.toContain("<script");
    expect(storedText.toLowerCase()).not.toContain("onload");
    expect(storedText.toLowerCase()).not.toContain("javascript:");

    const updatedHome = await svc.content.getSection("home");
    expect(updatedHome.hero.heroArtwork).toEqual({
      id: uploaded.id,
      src: `idb://${uploaded.id}`,
      alt: "Custom Hero Graphic",
    });

    // Reassign slot to another image; uploaded asset should now be deletable
    await svc.media.assignMediaToSlot("media-doge-typing", "home.hero.heroArtwork");
    const homeAfterAssign = await svc.content.getSection("home");
    expect(homeAfterAssign.hero.heroArtwork.id).toBe("media-doge-typing");

    await svc.media.deleteMedia(uploaded.id);
    expect(await getFileBlob(uploaded.id)).toBeNull();
  });

  it("registers cover images uploaded via eventsService into Media & Assets and protects them from deletion", async () => {
    const svc = createMockServices();
    const coverFile = new File(["fake-png-bytes"], "hackathon-cover.png", {
      type: "image/png",
    });

    const created = await svc.events.createEvent(
      {
        marker: "Tools: Next.js, FastAPI",
        title: "Hackathon 2026",
        subtitle: "48h Campus Build",
        category: "Event",
        dateLabel: "18 DEC 2026 · 09:00",
        location: "IT-105",
        description: "Build real campus tools.",
        status: "Published",
        showOnHome: true,
        order: 10,
      },
      coverFile,
    );

    expect(created.coverImage?.src).toMatch(/^idb:\/\//);
    expect(created.coverImage?.id).toBeTruthy();

    const media = await svc.media.listMedia();
    const registered = media.find((m) => m.id === created.coverImage?.id);
    expect(registered).toBeDefined();
    expect(registered?.filename).toBe("hackathon-cover.png");

    // In use by event cover -> blocked with 409 ASSET_IN_USE
    await expect(svc.media.deleteMedia(registered!.id)).rejects.toMatchObject({
      status: 409,
      code: "ASSET_IN_USE",
    });

    // Update event with a new cover file -> also registers in Media & Assets
    const newCoverFile = new File(["new-webp"], "hackathon-v2.webp", {
      type: "image/webp",
    });
    const updated = await svc.events.updateEvent(
      created.id,
      { title: "Hackathon 2026 Finals" },
      newCoverFile,
    );
    expect(updated.title).toBe("Hackathon 2026 Finals");
    expect(updated.coverImage?.id).not.toBe(created.coverImage?.id);

    // Old cover is no longer referenced and can be deleted cleanly
    await expect(svc.media.deleteMedia(registered!.id)).resolves.toBeUndefined();
  });

  it("uploads CV with Recruitment application and resolves downloadable URL", async () => {
    const svc = createMockServices();
    const cv = new File(["%PDF-1.4 demo"], "somchai-cv.pdf", {
      type: "application/pdf",
    });
    const created = await svc.recruitment.submitApplication(
      {
        personal: {
          firstName: "Somchai",
          lastName: "Narin",
          nickname: "Chai",
          studentId: "6987777",
          email: "somchai@student.mahidol.ac.th",
          phone: "0894567890",
          program: "DST",
          year: "1",
        },
        team: "projects",
        roleId: "frontend-dev",
        roleLabel: "Front End Developer",
        motivation: {
          expectation: "Learn Next.js",
          contribution: "Build UI",
          projectIdea: "Campus hub",
          teamExperience: "Class project",
        },
        agreedRequirements: true,
        agreedPdpa: true,
      },
      cv,
    );

    expect(created.status).toBe("Pending");
    expect(created.cv?.filename).toBe("somchai-cv.pdf");
    const dl = await svc.recruitment.getCvDownloadUrl(created.id);
    expect(dl.filename).toBe("somchai-cv.pdf");
    expect(dl.mimeType).toBe("application/pdf");
    expect(dl.url).toBeTruthy();

    const updated = await svc.recruitment.updateStatus(created.id, "Accepted");
    expect(updated.status).toBe("Accepted");
  });

  it("keeps FAQ Bank private until copyFaqBankToHome writes one-way into home.json", async () => {
    const svc = createMockServices();
    const beforeHome = await svc.content.getSection("home");
    const saved = await svc.inquiries.createFaqBankItem({
      question: "Can freshmen join?",
      answer: "Yes, all ICT and DST years are welcome.",
      category: "Recruitment",
    });
    const afterBankOnly = await svc.content.getSection("home");
    expect(afterBankOnly.faq.items.length).toBe(beforeHome.faq.items.length);

    await svc.inquiries.copyFaqBankToHome(saved.id);
    const afterPromote = await svc.content.getSection("home");
    expect(afterPromote.faq.items.some((q) => q.question === "Can freshmen join?")).toBe(
      true,
    );
  });

  it("manages inquiries, replies, tags, and mock admin auth session in sessionStorage", async () => {
    const svc = createMockServices();

    const inquiry = await svc.inquiries.submitInquiry({
      question: "When is orientation?",
      senderEmail: "student@student.mahidol.ac.th",
      category: "Events",
      consent: true,
    });
    expect(inquiry.status).toBe("Unanswered");

    const tagged = await svc.inquiries.updateTags(inquiry.id, ["Events", "Orientation", "Events"]);
    expect(tagged.tags).toEqual(["Events", "Orientation"]);

    // Auth validation
    await expect(
      svc.auth.login({
        email: "bad-email",
        password: "password123",
        confirmPassword: "password123",
      }),
    ).rejects.toMatchObject({ status: 422 });

    await expect(
      svc.auth.login({
        email: "admin@muictdev.club",
        password: "secret123",
        confirmPassword: "mismatch",
      }),
    ).rejects.toMatchObject({ status: 422 });

    const session = await svc.auth.login({
      email: "admin@muictdev.club",
      password: "secret123",
      confirmPassword: "secret123",
    });
    expect(session.authenticated).toBe(true);
    expect(session.email).toBe("admin@muictdev.club");
    expect(sessionStorage.getItem("muict_devclub_v1_admin_session")).toBeTruthy();

    const replied = await svc.inquiries.replyInquiry(inquiry.id, {
      body: "Orientation is on 11 Nov at IT-105.",
      markAnswered: true,
    });
    expect(replied.status).toBe("Answered");
    expect(replied.reply?.sentBy).toBe("admin@muictdev.club");

    expect(await svc.auth.getSession()).toMatchObject({
      email: "admin@muictdev.club",
      authenticated: true,
    });

    await svc.auth.logout();
    expect(await svc.auth.getSession()).toBeNull();
  });

  it("HttpAdapter sends Python-friendly FormData (payload + cv) and normalizes FastAPI 422 detail errors (Review Focus #5)", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          detail: [{ loc: ["body", "studentId"], msg: "must be 7 digits" }],
        }),
        {
          status: 422,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );
    const svc = createHttpServices({
      baseUrl: "http://localhost:8000/api/v1///",
      fetchImpl: fetchMock,
      getBearerToken: () => "jwt-test-token",
    });
    const cv = new File(["%PDF"], "cv.pdf", { type: "application/pdf" });
    await expect(
      svc.recruitment.submitApplication(
        {
          personal: {
            firstName: "A",
            lastName: "B",
            nickname: "C",
            studentId: "123",
            email: "a@b.com",
            phone: "0812345678",
            program: "ICT",
            year: "1",
          },
          team: "projects",
          roleId: "frontend-dev",
          roleLabel: "Front End Developer",
          motivation: {
            expectation: "e",
            contribution: "c",
            projectIdea: "p",
            teamExperience: "t",
          },
          agreedRequirements: true,
          agreedPdpa: true,
        },
        cv,
      ),
    ).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof ApiError &&
        err.status === 422 &&
        err.message.includes("must be 7 digits"),
    );

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8000/api/v1/recruitment/applications");
    expect(init.credentials).toBe("include");
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer jwt-test-token");
    expect(init.body).toBeInstanceOf(FormData);
    expect((init.body as FormData).has("payload")).toBe(true);
    expect((init.body as FormData).has("cv")).toBe(true);
  });

  it("HttpAdapter normalizes string detail, 409 ASSET_IN_USE, non-JSON errors, and 401 auth/me cleanly", async () => {
    const fetchMock = vi
      .fn()
      // 1) POST /media -> FormData with payload + file
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "asset-99",
            filename: "logo.png",
            title: "Club Logo",
            mimeType: "image/png",
            kind: "image",
            sizeBytes: 120,
            url: "https://cdn.example.com/logo.png",
            createdAt: "2026-11-21T00:00:00Z",
          }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        ),
      )
      // 2) DELETE /media/asset-99 -> 409 ASSET_IN_USE
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: "ASSET_IN_USE",
            message: "Asset is currently in use",
            usedBy: ["site.logoDark"],
          }),
          { status: 409, headers: { "Content-Type": "application/json" } },
        ),
      )
      // 3) GET /events -> 502 non-JSON HTML error
      .mockResolvedValueOnce(
        new Response("<html><body>Bad Gateway</body></html>", {
          status: 502,
          statusText: "Bad Gateway",
          headers: { "Content-Type": "text/html" },
        }),
      )
      // 4) GET /auth/me -> 401 string detail
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ detail: "Not authenticated" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
      );

    const svc = createHttpServices({
      baseUrl: "http://localhost:8000/api/v1/",
      fetchImpl: fetchMock,
      getBearerToken: () => "secret-bearer",
    });

    const png = new File(["png"], "logo.png", { type: "image/png" });
    const uploaded = await svc.media.uploadMedia({ file: png, title: "Club Logo" });
    expect(uploaded.id).toBe("asset-99");
    const [mediaUrl, mediaInit] = fetchMock.mock.calls[0];
    expect(mediaUrl).toBe("http://localhost:8000/api/v1/media");
    expect(mediaInit.body).toBeInstanceOf(FormData);
    expect((mediaInit.body as FormData).has("file")).toBe(true);
    expect((mediaInit.body as FormData).has("payload")).toBe(true);

    await expect(svc.media.deleteMedia("asset-99")).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof ApiError &&
        err.status === 409 &&
        err.code === "ASSET_IN_USE" &&
        ((err.details as { usedBy?: string[] })?.usedBy?.[0] === "site.logoDark"),
    );

    await expect(svc.events.listEvents()).rejects.toSatisfy(
      (err: unknown) => err instanceof ApiError && err.status === 502,
    );

    await expect(svc.auth.getSession()).resolves.toBeNull();
  });

  it("AppDataProvider initializes synchronously from JSON seeds and updates reactively on service mutations", async () => {
    const user = userEvent.setup();

    function Harness() {
      const { mode, site, home, faqBank, services } = useAppData();
      return createElement(
        "div",
        null,
        createElement("span", { "data-testid": "mode" }, mode),
        createElement("span", { "data-testid": "brand" }, site.brandName),
        createElement("span", { "data-testid": "faq-count" }, String(home.faq.items.length)),
        createElement("span", { "data-testid": "bank-count" }, String(faqBank.length)),
        createElement(
          "button",
          {
            type: "button",
            onClick: async () => {
              const item = await services.inquiries.createFaqBankItem({
                question: "How to contact?",
                answer: "Use the Ask Question modal.",
                category: "Other",
              });
              await services.inquiries.copyFaqBankToHome(item.id);
            },
          },
          "Add and Promote",
        ),
      );
    }

    render(createElement(AppDataProvider, null, createElement(Harness)));

    // Synchronous initial paint before async hydration completes
    expect(screen.getByTestId("mode")).toHaveTextContent("mock");
    expect(screen.getByTestId("brand")).toHaveTextContent("MUICT Dev Club");
    const initialFaqCount = Number(screen.getByTestId("faq-count").textContent);
    const initialBankCount = Number(screen.getByTestId("bank-count").textContent);
    expect(initialFaqCount).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /Add and Promote/i }));

    await waitFor(() => {
      expect(Number(screen.getByTestId("bank-count").textContent)).toBe(
        initialBankCount + 1,
      );
      expect(Number(screen.getByTestId("faq-count").textContent)).toBe(
        initialFaqCount + 1,
      );
    });
  });

  it("supports content update/export/resetAll, FAQ Bank CRUD, event deletion, and rejects invalid CV files", async () => {
    const svc = createMockServices();
    const home = await svc.content.getSection("home");
    await svc.content.updateSection("home", {
      ...home,
      hero: { ...home.hero, headline: "<Ship. Fast. />" },
    });
    const exported = await svc.content.exportSectionJson("home");
    expect(exported).toContain("<Ship. Fast. />");

    await svc.content.resetAll();
    const resetHome = await svc.content.getSection("home");
    expect(resetHome.hero.headline).toBe("<Learn. Hack. Deliver. />");

    // FAQ Bank update & delete
    const createdFaq = await svc.inquiries.createFaqBankItem({
      question: "Q1?",
      answer: "A1",
      category: "Other",
      tags: ["General"],
    });
    const editedFaq = await svc.inquiries.updateFaqBankItem(createdFaq.id, {
      answer: "A1 updated",
    });
    expect(editedFaq.answer).toBe("A1 updated");
    await svc.inquiries.deleteFaqBankItem(createdFaq.id);
    const bankAfter = await svc.inquiries.listFaqBank();
    expect(bankAfter.some((f) => f.id === createdFaq.id)).toBe(false);

    // Event deletion
    const evt = await svc.events.createEvent({
      marker: "Phase X",
      title: "Temp Event",
      subtitle: "Sub",
      category: "News",
      dateLabel: "01 JAN 2027",
      location: "Online",
      description: "Temp",
      status: "Draft",
      showOnHome: false,
      order: 99,
    });
    await svc.events.deleteEvent(evt.id);
    const allEvents = await svc.events.listEvents();
    expect(allEvents.some((e) => e.id === evt.id)).toBe(false);

    // Reject disallowed CV before storage
    const badCv = new File(["mz"], "payload.exe", {
      type: "application/x-msdownload",
    });
    await expect(
      svc.recruitment.submitApplication(
        {
          personal: {
            firstName: "A",
            lastName: "B",
            nickname: "C",
            studentId: "6987777",
            email: "a@student.mahidol.ac.th",
            phone: "0891234567",
            program: "ICT",
            year: "1",
          },
          team: "projects",
          roleId: "frontend-dev",
          roleLabel: "Front End Developer",
          motivation: {
            expectation: "e",
            contribution: "c",
            projectIdea: "p",
            teamExperience: "t",
          },
          agreedRequirements: true,
          agreedPdpa: true,
        },
        badCv,
      ),
    ).rejects.toMatchObject({ status: 400, code: "INVALID_FILE" });
  });

  it("HttpAdapter sends JSON for events without coverFile and FormData (payload + cover) when coverFile is present", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "evt-1",
            marker: "M",
            title: "JSON Event",
            subtitle: "S",
            category: "Event",
            dateLabel: "12 DEC 2026",
            location: "ICT",
            description: "Desc",
            status: "Published",
            showOnHome: true,
            order: 1,
            updatedAt: "2026-11-21T00:00:00Z",
          }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "evt-1",
            marker: "M",
            title: "Updated With Cover",
            subtitle: "S",
            category: "Event",
            dateLabel: "12 DEC 2026",
            location: "ICT",
            description: "Desc",
            coverImage: {
              id: "media-2",
              src: "https://cdn.example.com/cover.png",
              alt: "Updated With Cover",
            },
            status: "Published",
            showOnHome: true,
            order: 1,
            updatedAt: "2026-11-21T01:00:00Z",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );

    const svc = createHttpServices({
      baseUrl: "http://localhost:8000/api/v1",
      fetchImpl: fetchMock,
    });

    await svc.events.createEvent({
      marker: "M",
      title: "JSON Event",
      subtitle: "S",
      category: "Event",
      dateLabel: "12 DEC 2026",
      location: "ICT",
      description: "Desc",
      status: "Published",
      showOnHome: true,
      order: 1,
    });

    const [createUrl, createInit] = fetchMock.mock.calls[0];
    expect(createUrl).toBe("http://localhost:8000/api/v1/events");
    expect(typeof createInit.body).toBe("string");
    expect(new Headers(createInit.headers).get("Content-Type")).toBe(
      "application/json",
    );

    const cover = new File(["png"], "cover.png", { type: "image/png" });
    await svc.events.updateEvent("evt-1", { title: "Updated With Cover" }, cover);

    const [patchUrl, patchInit] = fetchMock.mock.calls[1];
    expect(patchUrl).toBe("http://localhost:8000/api/v1/events/evt-1");
    expect(patchInit.method).toBe("PATCH");
    expect(patchInit.body).toBeInstanceOf(FormData);
    expect((patchInit.body as FormData).has("payload")).toBe(true);
    expect((patchInit.body as FormData).has("cover")).toBe(true);
  });

  it("removes event coverImage consistently in both MockAdapter and HttpAdapter (coverImage: null or explicit undefined)", async () => {
    const mockSvc = createMockServices();
    const cover = new File(["png"], "cover-a.png", { type: "image/png" });
    const created = await mockSvc.events.createEvent(
      {
        marker: "M1",
        title: "Cover Removal Test",
        subtitle: "Sub",
        category: "Event",
        dateLabel: "19 DEC 2026",
        location: "ICT",
        description: "Desc",
        status: "Published",
        showOnHome: true,
        order: 20,
      },
      cover,
    );
    expect(created.coverImage).toBeDefined();

    // Preserved when coverImage key is omitted
    const renamed = await mockSvc.events.updateEvent(created.id, {
      title: "Cover Still Here",
    });
    expect(renamed.coverImage).toEqual(created.coverImage);

    // Removed via explicit null
    const clearedByNull = await mockSvc.events.updateEvent(created.id, {
      coverImage: null,
    });
    expect(clearedByNull.coverImage).toBeUndefined();

    // Re-attach then remove via explicit undefined
    const reattached = await mockSvc.events.updateEvent(created.id, {
      coverImage: created.coverImage,
    });
    expect(reattached.coverImage).toEqual(created.coverImage);
    const clearedByUndefined = await mockSvc.events.updateEvent(created.id, {
      coverImage: undefined,
    });
    expect(clearedByUndefined.coverImage).toBeUndefined();

    // HttpAdapter serializes coverImage: null for both null and explicit undefined
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ ...created, coverImage: undefined }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ ...created, coverImage: undefined }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(created), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

    const httpSvc = createHttpServices({
      baseUrl: "http://localhost:8000/api/v1",
      fetchImpl: fetchMock,
    });

    await httpSvc.events.updateEvent(created.id, { coverImage: null });
    await httpSvc.events.updateEvent(created.id, { coverImage: undefined });
    await httpSvc.events.updateEvent(created.id, { title: "Preserve" });

    expect(JSON.parse(String(fetchMock.mock.calls[0][1].body))).toEqual({
      coverImage: null,
    });
    expect(JSON.parse(String(fetchMock.mock.calls[1][1].body))).toEqual({
      coverImage: null,
    });
    expect(JSON.parse(String(fetchMock.mock.calls[2][1].body))).toEqual({
      title: "Preserve",
    });
  });

  it("AppDataProvider in api mode initializes admin-only state (applications, inquiries, faqBank) as [] synchronously", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/auth/me")) {
        return new Response(JSON.stringify({ detail: "Not authenticated" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.endsWith("/events")) {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.endsWith("/media")) {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({}), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    });

    const apiServices = createHttpServices({
      baseUrl: "http://localhost:8000/api/v1",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    function ApiHarness() {
      const {
        mode,
        site,
        applications,
        inquiries,
        faqBank,
        isHydrated,
      } = useAppData();
      return createElement(
        "div",
        null,
        createElement("span", { "data-testid": "api-mode" }, mode),
        createElement("span", { "data-testid": "api-brand" }, site.brandName),
        createElement(
          "span",
          { "data-testid": "api-apps" },
          String(applications.length),
        ),
        createElement(
          "span",
          { "data-testid": "api-inquiries" },
          String(inquiries.length),
        ),
        createElement(
          "span",
          { "data-testid": "api-faq-bank" },
          String(faqBank.length),
        ),
        createElement(
          "span",
          { "data-testid": "api-hydrated" },
          String(isHydrated),
        ),
      );
    }

    render(
      createElement(AppDataProvider, {
        mode: "api",
        services: apiServices,
        children: createElement(ApiHarness),
      }),
    );

    // Synchronous first paint assertions (no fake mock admin seed data in api mode)
    expect(screen.getByTestId("api-mode")).toHaveTextContent("api");
    expect(screen.getByTestId("api-brand")).toHaveTextContent("MUICT Dev Club");
    expect(screen.getByTestId("api-apps")).toHaveTextContent("0");
    expect(screen.getByTestId("api-inquiries")).toHaveTextContent("0");
    expect(screen.getByTestId("api-faq-bank")).toHaveTextContent("0");

    await waitFor(() =>
      expect(screen.getByTestId("api-hydrated")).toHaveTextContent("true"),
    );
    expect(screen.getByTestId("api-apps")).toHaveTextContent("0");
    expect(screen.getByTestId("api-inquiries")).toHaveTextContent("0");
    expect(screen.getByTestId("api-faq-bank")).toHaveTextContent("0");
  });
});
