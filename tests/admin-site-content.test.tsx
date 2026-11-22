import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminSiteContentPage from "@/app/admin/site-content/page";
import { MediaLibraryTab } from "@/components/admin/MediaLibraryTab";
import { WebsiteCopyTab } from "@/components/admin/WebsiteCopyTab";
import { AppDataProvider } from "@/context/AppDataContext";
import mediaJson from "@/content/media.json";
import { createMockServices } from "@/lib/services/mockAdapter";
import { clearAllFiles } from "@/lib/storage/indexedDbFiles";
import { clearAllOverlays } from "@/lib/storage/localOverlay";
import { MAX_UPLOAD_BYTES } from "@/lib/storage/svgSanitizer";

const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  usePathname: () => "/admin/site-content",
}));

function stubObjectUrlFns() {
  const prevCreate = Object.getOwnPropertyDescriptor(URL, "createObjectURL");
  const prevRevoke = Object.getOwnPropertyDescriptor(URL, "revokeObjectURL");
  const createSpy = vi.fn<(obj: Blob | MediaSource) => string>();
  const revokeSpy = vi.fn<(url: string) => void>();

  Object.defineProperty(URL, "createObjectURL", {
    value: createSpy,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    value: revokeSpy,
    configurable: true,
    writable: true,
  });

  const restore = () => {
    if (prevCreate) {
      Object.defineProperty(URL, "createObjectURL", prevCreate);
    } else {
      Reflect.deleteProperty(URL, "createObjectURL");
    }
    if (prevRevoke) {
      Object.defineProperty(URL, "revokeObjectURL", prevRevoke);
    } else {
      Reflect.deleteProperty(URL, "revokeObjectURL");
    }
  };

  return { createSpy, revokeSpy, restore };
}

describe("Admin Site Content (/admin/site-content)", () => {
  let restoreObjectUrls: (() => void) | null = null;

  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    clearAllOverlays();
    await clearAllFiles();
    mockPush.mockReset();
    mockReplace.mockReset();
  });

  afterEach(() => {
    restoreObjectUrls?.();
    restoreObjectUrls = null;
    vi.restoreAllMocks();
  });

  describe("WebsiteCopyTab", () => {
    it("edits Home Hero headline, saves into contentService, reverts with Discard Changes, and warns on Export .json for idb:// refs", async () => {
      const user = userEvent.setup();
      const services = createMockServices();

      render(
        <AppDataProvider services={services} mode="mock">
          <WebsiteCopyTab />
        </AppDataProvider>,
      );

      // Default active section is Home · Hero with Headline visible immediately
      const headlineInput = (await screen.findByLabelText(
        /Headline/i,
      )) as HTMLInputElement;
      expect(headlineInput.value).toBe("<Learn. Hack. Deliver. />");

      // Edit headline and discard -> reverts to live value
      await user.clear(headlineInput);
      await user.type(headlineInput, "Temporary Headline");
      expect(headlineInput.value).toBe("Temporary Headline");

      await user.click(
        screen.getByRole("button", { name: /Discard Changes/i }),
      );
      expect(headlineInput.value).toBe("<Learn. Hack. Deliver. />");

      // Edit headline and save -> persists in services.content and shows confirmation banner
      await user.clear(headlineInput);
      await user.type(headlineInput, "<Build. Ship. Repeat. />");
      await user.click(screen.getByRole("button", { name: /Save Changes/i }));

      await waitFor(() =>
        expect(
          screen.getByText(/Changes saved successfully/i),
        ).toBeInTheDocument(),
      );

      const savedHome = await services.content.getSection("home");
      expect(savedHome.hero.headline).toBe("<Build. Ship. Repeat. />");

      // Upload a local idb:// asset and assign it to home.hero.heroArtwork so Export .json detects idb://
      const uploaded = await services.media.uploadMedia({
        file: new File(
          [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10"/></svg>`],
          "local-banner.svg",
          { type: "image/svg+xml" },
        ),
        sourceSlot: "home.hero.heroArtwork",
      });
      expect(uploaded.url).toMatch(/^idb:\/\//);

      const { createSpy, revokeSpy, restore } = stubObjectUrlFns();
      restoreObjectUrls = restore;
      createSpy.mockReturnValue("blob:json-export");
      const anchorClickSpy = vi
        .spyOn(HTMLAnchorElement.prototype, "click")
        .mockImplementation(() => {});

      await user.click(screen.getByRole("button", { name: /Export \.json/i }));

      await waitFor(() =>
        expect(screen.getByRole("alert")).toHaveTextContent(
          /Local IndexedDB media references detected/i,
        ),
      );
      expect(screen.getByRole("alert")).toHaveTextContent(/IndexedDB/i);
      expect(screen.getAllByText(/idb:\/\//i).length).toBeGreaterThan(0);
      expect(createSpy).toHaveBeenCalledTimes(1);
      expect(anchorClickSpy).toHaveBeenCalledTimes(1);
      expect(revokeSpy).toHaveBeenCalledWith("blob:json-export");
    });

    it("supports dynamic Add and Remove for FAQ items and Reset Defaults confirmation modal", async () => {
      const user = userEvent.setup();
      const services = createMockServices();

      render(
        <AppDataProvider services={services} mode="mock">
          <WebsiteCopyTab />
        </AppDataProvider>,
      );

      // Navigate to Home · FAQ section
      await user.click(
        await screen.findByRole("button", { name: /Home · FAQ/i }),
      );

      const beforeHome = await services.content.getSection("home");
      const initialCount = beforeHome.faq.items.length;

      // Add a new FAQ item
      await user.click(screen.getByRole("button", { name: /Add FAQ Item/i }));
      const questionInputs = screen.getAllByLabelText(/^Question$/i);
      const answerInputs = screen.getAllByLabelText(/^Answer$/i);
      expect(questionInputs).toHaveLength(initialCount + 1);

      const lastIndex = questionInputs.length - 1;
      await user.type(questionInputs[lastIndex], "Can I join multiple squads?");
      await user.type(
        answerInputs[lastIndex],
        "Yes, you can collaborate across teams during project sprints.",
      );

      await user.click(screen.getByRole("button", { name: /Save Changes/i }));
      await waitFor(() =>
        expect(
          screen.getByText(/Changes saved successfully/i),
        ).toBeInTheDocument(),
      );

      const afterAdd = await services.content.getSection("home");
      expect(afterAdd.faq.items).toHaveLength(initialCount + 1);
      expect(afterAdd.faq.items[initialCount].question).toBe(
        "Can I join multiple squads?",
      );

      // Remove the newly added FAQ item and save
      const removeButtons = screen.getAllByRole("button", {
        name: /Remove FAQ/i,
      });
      await user.click(removeButtons[removeButtons.length - 1]);
      expect(screen.getAllByLabelText(/^Question$/i)).toHaveLength(
        initialCount,
      );

      await user.click(screen.getByRole("button", { name: /Save Changes/i }));
      await waitFor(() =>
        expect(
          screen.getByText(/Changes saved successfully/i),
        ).toBeInTheDocument(),
      );
      const afterRemove = await services.content.getSection("home");
      expect(afterRemove.faq.items).toHaveLength(initialCount);

      // Edit headline then Reset Defaults via confirmation Modal
      await user.click(screen.getByRole("button", { name: /Home · Hero/i }));
      const headlineInput = (await screen.findByLabelText(
        /Headline/i,
      )) as HTMLInputElement;
      await user.clear(headlineInput);
      await user.type(headlineInput, "Custom Override");
      await user.click(screen.getByRole("button", { name: /Save Changes/i }));
      await waitFor(() =>
        expect(
          screen.getByText(/Changes saved successfully/i),
        ).toBeInTheDocument(),
      );

      await user.click(
        screen.getByRole("button", { name: /Reset Defaults/i }),
      );
      const modal = screen.getByRole("dialog");
      await user.click(
        within(modal).getByRole("button", { name: /Confirm Reset/i }),
      );

      await waitFor(() => {
        expect((screen.getByLabelText(/Headline/i) as HTMLInputElement).value).toBe(
          "<Learn. Hack. Deliver. />",
        );
      });
    });

    it("edits Recruitment status/roles and bilingual Legal clauses dynamically", async () => {
      const user = userEvent.setup();
      const services = createMockServices();

      render(
        <AppDataProvider services={services} mode="mock">
          <WebsiteCopyTab />
        </AppDataProvider>,
      );

      // Switch to Recruitment Copy & Roles
      await user.click(
        await screen.findByRole("button", { name: /Recruitment Copy & Roles/i }),
      );
      const openCheckbox = screen.getByRole("checkbox", {
        name: /Recruitment Applications Open/i,
      });
      expect(openCheckbox).toBeChecked();
      await user.click(openCheckbox);
      expect(openCheckbox).not.toBeChecked();

      const addRoleBtns = screen.getAllByRole("button", { name: /Add Role/i });
      await user.click(addRoleBtns[0]);
      const beforeRec = await services.content.getSection("recruitment");
      const nextIdx = beforeRec.projectsTeamRoles.length + 1;
      await user.type(
        screen.getByLabelText(new RegExp(`Projects Team Roles Title ${nextIdx}`, "i")),
        "DevOps",
      );
      await user.type(
        screen.getByLabelText(
          new RegExp(`Projects Team Roles Description ${nextIdx}`, "i"),
        ),
        "CI/CD",
      );

      await user.click(screen.getByRole("button", { name: /Save Changes/i }));
      await waitFor(() =>
        expect(
          screen.getByText(/Changes saved successfully/i),
        ).toBeInTheDocument(),
      );
      const savedRec = await services.content.getSection("recruitment");
      expect(savedRec.isOpen).toBe(false);
      expect(
        savedRec.projectsTeamRoles.some((r) => r.title === "DevOps"),
      ).toBe(true);

      // Switch to Legal Documents (EN / TH)
      await user.click(
        screen.getByRole("button", { name: /Legal Documents \(EN \/ TH\)/i }),
      );
      await user.click(screen.getByRole("button", { name: /ภาษาไทย \(TH\)/i }));
      await user.click(screen.getByRole("button", { name: /Add Clause/i }));

      const beforeLegal = await services.content.getSection("legal");
      const clauseIdx = beforeLegal.privacyPolicy.th.sections.length + 1;
      await user.type(
        screen.getByLabelText(new RegExp(`Clause ${clauseIdx} Heading`, "i")),
        "Extra",
      );
      await user.type(
        screen.getByLabelText(
          new RegExp(`^Clause ${clauseIdx} Paragraph 1$`, "i"),
        ),
        "Detail",
      );

      await user.click(screen.getByRole("button", { name: /Save Changes/i }));
      await waitFor(() =>
        expect(
          screen.getByText(/Changes saved successfully/i),
        ).toBeInTheDocument(),
      );
      const savedLegal = await services.content.getSection("legal");
      expect(savedLegal.privacyPolicy.th.sections).toHaveLength(clauseIdx);
    }, 15000);

    it("preserves input focus when typing multi-character text into Recruitment Role ID and Step Number inputs", async () => {
      const user = userEvent.setup();
      const services = createMockServices();

      render(
        <AppDataProvider services={services} mode="mock">
          <WebsiteCopyTab />
        </AppDataProvider>,
      );

      await user.click(
        await screen.findByRole("button", { name: /Recruitment Copy & Roles/i }),
      );

      const roleIdInput = screen.getByLabelText(
        /^Projects Team Roles ID 1$/i,
      ) as HTMLInputElement;
      await user.clear(roleIdInput);
      await user.type(roleIdInput, "custom-fullstack");
      expect(roleIdInput).toHaveFocus();
      expect(roleIdInput.value).toBe("custom-fullstack");

      const stepNumberInput = screen.getByLabelText(
        /^Step 1 Number$/i,
      ) as HTMLInputElement;
      await user.clear(stepNumberInput);
      await user.type(stepNumberInput, "01A");
      expect(stepNumberInput).toHaveFocus();
      expect(stepNumberInput.value).toBe("01A");

      await user.click(screen.getByRole("button", { name: /Save Changes/i }));
      await waitFor(() =>
        expect(
          screen.getByText(/Changes saved successfully/i),
        ).toBeInTheDocument(),
      );

      const savedRec = await services.content.getSection("recruitment");
      expect(savedRec.projectsTeamRoles[0].id).toBe("custom-fullstack");
      expect(savedRec.openedCopy.steps[0].number).toBe("01A");
    }, 15000);
  });

  describe("MediaLibraryTab", () => {
    it("uploads sanitized SVG, increments SVG filter count, rejects invalid files, filters/searches/sorts, assigns slot, and blocks deleting in-use assets (Review Focus #1 & #3)", async () => {
      const user = userEvent.setup();
      const { createSpy, restore } = stubObjectUrlFns();
      restoreObjectUrls = restore;
      createSpy.mockReturnValue("blob:svg-test");

      const services = createMockServices();

      render(
        <AppDataProvider services={services} mode="mock">
          <MediaLibraryTab />
        </AppDataProvider>,
      );

      const initialSvgCount = mediaJson.filter((m) => m.kind === "svg").length;
      const initialImageCount = mediaJson.filter(
        (m) => m.kind === "image",
      ).length;
      const initialTotal = mediaJson.length;

      expect(
        await screen.findByRole("button", {
          name: new RegExp(`^All \\(${initialTotal}\\)$`, "i"),
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", {
          name: new RegExp(`^Images \\(${initialImageCount}\\)$`, "i"),
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", {
          name: new RegExp(`^SVG \\(${initialSvgCount}\\)$`, "i"),
        }),
      ).toBeInTheDocument();

      // Upload unsafe SVG -> sanitized notice + SVG filter count increments
      const uploadInput = screen.getByLabelText(
        /Upload media/i,
      ) as HTMLInputElement;
      const dirtySvg = new File(
        [
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><script>alert(1)</script><rect width="10" height="10"/></svg>`,
        ],
        "badge.svg",
        { type: "image/svg+xml" },
      );
      await user.upload(uploadInput, dirtySvg);

      await waitFor(() =>
        expect(screen.getByText("badge.svg")).toBeInTheDocument(),
      );
      expect(screen.getByText(/sanitized/i)).toBeInTheDocument();
      expect(
        screen.getByRole("button", {
          name: new RegExp(`^SVG \\(${initialSvgCount + 1}\\)$`, "i"),
        }),
      ).toBeInTheDocument();

      // Oversized file (> 10 MB) -> inline error
      const tooBig = new File(
        [new Uint8Array(MAX_UPLOAD_BYTES + 1)],
        "huge.png",
        { type: "image/png" },
      );
      await user.upload(uploadInput, tooBig);
      await waitFor(() =>
        expect(screen.getByRole("alert")).toHaveTextContent(
          /exceeds the 10 MB maximum upload size/i,
        ),
      );

      // Filter by SVG, search, and sort
      await user.click(
        screen.getByRole("button", {
          name: new RegExp(`^SVG \\(${initialSvgCount + 1}\\)$`, "i"),
        }),
      );
      expect(screen.queryByText("campus-ict.png")).not.toBeInTheDocument();
      expect(screen.getByText("badge.svg")).toBeInTheDocument();

      const searchInput = screen.getByLabelText(/Search media assets/i);
      await user.type(searchInput, "head-banner");
      expect(screen.getByText("head-banner.svg")).toBeInTheDocument();
      expect(screen.queryByText("badge.svg")).not.toBeInTheDocument();

      // Attempt deleting an in-use featured asset -> inline "in use" error
      const heroCard = screen.getByTestId("media-card-media-head-banner");
      await user.click(
        within(heroCard).getByRole("button", { name: /^Delete$/i }),
      );
      await waitFor(() =>
        expect(screen.getByText(/in use/i)).toBeInTheDocument(),
      );

      // Clear search and switch to All, assign badge.svg to a slot, then reassign back via UI & delete badge.svg
      await user.clear(searchInput);
      await user.click(
        screen.getByRole("button", {
          name: new RegExp(`^All \\(${initialTotal + 1}\\)$`, "i"),
        }),
      );
      const sortSelect = screen.getByLabelText(/Sort media assets/i);
      await user.selectOptions(sortSelect, "alpha");

      const badgeCard = screen.getByText("badge.svg").closest("article")!;
      await user.click(
        within(badgeCard).getByRole("button", { name: /Copy URL/i }),
      );
      expect(
        within(badgeCard).getByRole("button", { name: /Copied/i }),
      ).toBeInTheDocument();

      await user.click(
        within(badgeCard).getByRole("button", { name: /Assign to Slot/i }),
      );
      const slotModal = screen.getByRole("dialog");
      await user.click(
        within(slotModal).getByRole("button", {
          name: /home\.location\.image/i,
        }),
      );

      await waitFor(async () => {
        const home = await services.content.getSection("home");
        expect(home.location.image.src).toMatch(/^idb:\/\//);
      });

      // Reassign home.location.image back to campus-ict.png via UI so badge.svg becomes unused
      const campusCard = screen.getByTestId("media-card-media-campus-ict");
      await user.click(
        within(campusCard).getByRole("button", { name: /Assign to Slot/i }),
      );
      const reassignModal = screen.getByRole("dialog");
      await user.click(
        within(reassignModal).getByRole("button", {
          name: /home\.location\.image/i,
        }),
      );

      await waitFor(async () => {
        const home = await services.content.getSection("home");
        expect(home.location.image.id).toBe("media-campus-ict");
      });

      await user.selectOptions(sortSelect, "newest");

      // Pagination works when > 9 assets exist
      expect(
        screen.getByRole("navigation", { name: /Pagination/i }),
      ).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: /Next page/i }));
      await user.click(screen.getByRole("button", { name: /Previous page/i }));

      const updatedBadgeCard = screen
        .getByText("badge.svg")
        .closest("article")!;
      await user.click(
        within(updatedBadgeCard).getByRole("button", { name: /^Delete$/i }),
      );

      await waitFor(() =>
        expect(screen.queryByText("badge.svg")).not.toBeInTheDocument(),
      );
    });
  });

  describe("AdminSiteContentPage integration", () => {
    it("switches cleanly between Website copy and Media & Assets tabs inside AdminShell", async () => {
      const user = userEvent.setup();
      const services = createMockServices();
      await services.auth.login({
        email: "admin@muictdev.club",
        password: "password123",
        confirmPassword: "password123",
      });

      render(
        <AppDataProvider services={services} mode="mock">
          <AdminSiteContentPage />
        </AppDataProvider>,
      );

      expect(
        await screen.findByRole("heading", {
          name: /Content & Text Management/i,
        }),
      ).toBeInTheDocument();

      const copyTab = screen.getByRole("tab", { name: /Website copy/i });
      const mediaTab = screen.getByRole("tab", { name: /Media & Assets/i });
      expect(copyTab).toHaveAttribute("aria-selected", "true");
      expect(mediaTab).toHaveAttribute("aria-selected", "false");
      expect(await screen.findByLabelText(/Headline/i)).toBeInTheDocument();

      await user.click(mediaTab);
      expect(mediaTab).toHaveAttribute("aria-selected", "true");
      expect(copyTab).toHaveAttribute("aria-selected", "false");
      expect(screen.getByLabelText(/Upload media/i)).toBeInTheDocument();
    });
  });
});
