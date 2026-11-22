import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminEventsPage from "@/app/admin/events/page";
import AdminInquiriesPage from "@/app/admin/inquiries/page";
import { EventsManager } from "@/components/admin/EventsManager";
import { InquiriesManager } from "@/components/admin/InquiriesManager";
import { AppDataProvider } from "@/context/AppDataContext";
import adminSeedJson from "@/content/admin-seed.json";
import eventsJson from "@/content/events.json";
import homeJson from "@/content/home.json";
import { createMockServices } from "@/lib/services/mockAdapter";
import { clearAllFiles } from "@/lib/storage/indexedDbFiles";
import { clearAllOverlays } from "@/lib/storage/localOverlay";

const mockPush = vi.fn();
const mockReplace = vi.fn();
let mockPathname = "/admin/events";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  usePathname: () => mockPathname,
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

describe("Admin Events & Inquiries management (/admin/events & /admin/inquiries)", () => {
  let restoreObjectUrls: (() => void) | null = null;

  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    clearAllOverlays();
    await clearAllFiles();
    mockPush.mockReset();
    mockReplace.mockReset();
    mockPathname = "/admin/events";
  });

  afterEach(() => {
    restoreObjectUrls?.();
    restoreObjectUrls = null;
    vi.restoreAllMocks();
  });

  it("creates a Published showOnHome Event, filters/searches, edits with cover upload into Media & Assets, and deletes with confirmation", async () => {
    const user = userEvent.setup();
    const { createSpy, restore } = stubObjectUrlFns();
    restoreObjectUrls = restore;
    createSpy.mockReturnValue("blob:event-cover");

    const services = createMockServices();

    render(
      <AppDataProvider services={services} mode="mock">
        <EventsManager />
      </AppDataProvider>,
    );

    // Seeded events visible in both desktop table and mobile cards
    const desktopTable = await screen.findByTestId("events-desktop-table");
    const mobileCards = screen.getByTestId("events-mobile-cards");
    expect(
      within(desktopTable).getByText("First Meet & Club Onboarding"),
    ).toBeInTheDocument();
    expect(
      within(mobileCards).getByText("First Meet & Club Onboarding"),
    ).toBeInTheDocument();

    // Open Add Event modal and create a Published showOnHome event
    await user.click(screen.getByRole("button", { name: /Add Event/i }));
    const createDialog = screen.getByRole("dialog");

    await user.type(within(createDialog).getByLabelText(/Title/i), "ICT Hackathon 2026");
    await user.type(
      within(createDialog).getByLabelText(/Date/i),
      "15 Dec 2026 · 09:00",
    );
    await user.type(within(createDialog).getByLabelText(/Location/i), "ICT Building");
    await user.click(within(createDialog).getByLabelText(/Show on Home/i));
    await user.click(within(createDialog).getByRole("button", { name: /^Publish$/i }));

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(
      within(screen.getByTestId("events-desktop-table")).getByText(
        "ICT Hackathon 2026",
      ),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId("events-mobile-cards")).getByText(
        "ICT Hackathon 2026",
      ),
    ).toBeInTheDocument();

    const storedAfterCreate = await services.events.listEvents();
    const createdEvent = storedAfterCreate.find(
      (evt) => evt.title === "ICT Hackathon 2026",
    );
    expect(createdEvent).toBeDefined();
    expect(createdEvent?.status).toBe("Published");
    expect(createdEvent?.showOnHome).toBe(true);

    // Filter pills & search
    await user.click(screen.getByRole("button", { name: /^Draft\b/i }));
    expect(
      within(screen.getByTestId("events-desktop-table")).queryByText(
        "ICT Hackathon 2026",
      ),
    ).not.toBeInTheDocument();
    expect(
      within(screen.getByTestId("events-desktop-table")).getByText(
        "Backend Architecture & Cloud Deployment",
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^News\b/i }));
    expect(
      within(screen.getByTestId("events-desktop-table")).getByText(
        "2026 Member Recruitment Now Open",
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^All\b/i }));
    const searchInput = screen.getByPlaceholderText(/Search title, category, or location/i);
    await user.type(searchInput, "ICT Hackathon");
    expect(
      within(screen.getByTestId("events-desktop-table")).getByText(
        "ICT Hackathon 2026",
      ),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId("events-desktop-table")).queryByText(
        "First Meet & Club Onboarding",
      ),
    ).not.toBeInTheDocument();

    // Edit ICT Hackathon 2026 and upload a cover PNG -> verifies Media & Assets registration
    const tableRow = within(screen.getByTestId("events-desktop-table"))
      .getByText("ICT Hackathon 2026")
      .closest("tr")!;
    await user.click(within(tableRow).getByRole("button", { name: /Edit/i }));

    const editDialog = screen.getByRole("dialog");
    const coverInput = within(editDialog).getByLabelText(
      /Upload cover image/i,
    ) as HTMLInputElement;
    const pngFile = new File(["fake-png"], "hackathon-poster.png", {
      type: "image/png",
    });
    await user.upload(coverInput, pngFile);
    await waitFor(() =>
      expect(
        within(editDialog).getAllByText("hackathon-poster.png").length,
      ).toBeGreaterThan(0),
    );
    await user.click(within(editDialog).getByRole("button", { name: /^Publish$/i }));

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );

    const mediaList = await services.media.listMedia();
    expect(
      mediaList.some((asset) => asset.filename === "hackathon-poster.png"),
    ).toBe(true);

    const updatedEvents = await services.events.listEvents();
    const updatedHackathon = updatedEvents.find(
      (evt) => evt.title === "ICT Hackathon 2026",
    );
    expect(updatedHackathon?.coverImage?.src).toMatch(/^idb:\/\//);

    // Delete with confirmation
    const updatedRow = within(screen.getByTestId("events-desktop-table"))
      .getByText("ICT Hackathon 2026")
      .closest("tr")!;
    await user.click(within(updatedRow).getByRole("button", { name: /Delete/i }));

    const confirmDialog = screen.getByRole("dialog");
    await user.click(
      within(confirmDialog).getByRole("button", { name: /Confirm Delete/i }),
    );

    await waitFor(() =>
      expect(
        screen.getByText(/No matching events or news items found\./i),
      ).toBeInTheDocument(),
    );
    await user.clear(searchInput);
    expect(
      within(screen.getByTestId("events-desktop-table")).queryByText(
        "ICT Hackathon 2026",
      ),
    ).not.toBeInTheDocument();

    const finalEvents = await services.events.listEvents();
    expect(finalEvents).toHaveLength(eventsJson.length);
  }, 15000);

  it("validates required Event fields, supports MediaPickerModal + cover removal, and paginates > 10 events", async () => {
    const user = userEvent.setup();
    const services = createMockServices();

    // Seed 5 extra events so total = 12 (> PAGE_SIZE 10) for pagination verification
    for (let i = 1; i <= 5; i += 1) {
      await services.events.createEvent({
        marker: `Extra ${i}`,
        title: `Paged Event ${i}`,
        subtitle: `Sub ${i}`,
        category: "Event",
        dateLabel: "01 MAR 2027",
        location: "IT-105",
        description: `Desc ${i}`,
        status: "Published",
        showOnHome: false,
        order: 50 + i,
      });
    }

    render(
      <AppDataProvider services={services} mode="mock">
        <EventsManager />
      </AppDataProvider>,
    );

    await screen.findByTestId("events-desktop-table");
    expect(screen.getByRole("navigation", { name: /Pagination/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Next page/i }));
    expect(
      within(screen.getByTestId("events-desktop-table")).getByText("Paged Event 5"),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Previous page/i }));

    // Required field inline validation + MediaPickerModal + cover removal
    await user.click(screen.getByRole("button", { name: /Add Event/i }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: /Save Draft/i }));
    expect(within(dialog).getByText(/Title is required/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/Date is required/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/Location is required/i)).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText(/Title/i), "Draft Picker Event");
    await user.type(within(dialog).getByLabelText(/Date/i), "02 APR 2027");
    await user.type(within(dialog).getByLabelText(/Location/i), "Online");
    await user.click(
      within(dialog).getByRole("button", { name: /Choose from Media Library/i }),
    );
    const picker = await screen.findByRole("dialog", {
      name: /Choose Event Cover Image/i,
    });
    await user.click(
      within(picker).getByRole("button", { name: /Faculty of ICT Salaya Campus/i }),
    );
    await user.click(within(dialog).getByRole("button", { name: /Save Draft/i }));

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );

    const createdList = await services.events.listEvents();
    const draftEvent = createdList.find((e) => e.title === "Draft Picker Event");
    expect(draftEvent?.status).toBe("Draft");
    expect(draftEvent?.coverImage?.id).toBe("media-campus-ict");

    // Remove cover on edit
    await user.click(screen.getByRole("button", { name: /^Draft\b/i }));
    const draftRow = within(screen.getByTestId("events-desktop-table"))
      .getByText("Draft Picker Event")
      .closest("tr")!;
    await user.click(within(draftRow).getByRole("button", { name: /Edit/i }));
    const editModal = screen.getByRole("dialog");
    await user.click(within(editModal).getByRole("button", { name: /Remove Cover/i }));
    await user.click(within(editModal).getByRole("button", { name: /Save Draft/i }));

    await waitFor(async () => {
      const updated = (await services.events.listEvents()).find(
        (e) => e.title === "Draft Picker Event",
      );
      expect(updated?.coverImage).toBeUndefined();
    });
  }, 15000);

  it("auto-selects first inquiry, replies via Dev Club email, manages tags, keeps FAQ Bank private, and promotes one-way to Home FAQ", async () => {
    const user = userEvent.setup();
    const services = createMockServices();
    const initialHomeFaqCount = homeJson.faq.items.length;

    render(
      <AppDataProvider services={services} mode="mock">
        <InquiriesManager />
      </AppDataProvider>,
    );

    // First inquiry auto-selected on load inside detail panel
    const detailPanel = await screen.findByTestId("inquiry-detail-panel");
    expect(
      within(detailPanel).getByRole("heading", {
        name: adminSeedJson.inquiries[0].question,
      }),
    ).toBeInTheDocument();
    expect(
      within(detailPanel).getByText(
        new RegExp(adminSeedJson.inquiries[0].senderEmail, "i"),
      ),
    ).toBeInTheDocument();

    // Live Published FAQs KPI matches home.json
    const publishedKpi = screen.getByTestId("kpi-published-faqs");
    expect(
      within(publishedKpi).getByText(new RegExp(`^${initialHomeFaqCount}\\s+on Home$`, "i")),
    ).toBeInTheDocument();

    // Add a tag to the selected inquiry
    await user.click(within(detailPanel).getByRole("button", { name: /\+ Add Tag/i }));
    await user.type(within(detailPanel).getByLabelText(/New tag name/i), "Freshmen");
    await user.click(within(detailPanel).getByRole("button", { name: /^Add$/i }));
    await waitFor(() =>
      expect(within(detailPanel).getByText("Freshmen")).toBeInTheDocument(),
    );

    // Reply via Dev Club Email -> marks inquiry Answered and displays reply in detail panel
    await user.click(
      within(detailPanel).getByRole("button", { name: /Reply via Dev Club Email/i }),
    );
    const replyDialog = screen.getByRole("dialog");
    expect(
      within(replyDialog).getByDisplayValue(adminSeedJson.inquiries[0].senderEmail),
    ).toBeInTheDocument();
    await user.type(
      within(replyDialog).getByLabelText(/Reply message/i),
      "Welcome to MUICT Dev Club!",
    );
    await user.click(within(replyDialog).getByRole("button", { name: /Send Reply/i }));

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(
      within(detailPanel).getByText("Welcome to MUICT Dev Club!"),
    ).toBeInTheDocument();
    expect(within(detailPanel).getByText("Answered")).toBeInTheDocument();

    // Switch to FAQ Bank tab
    await user.click(screen.getByRole("tab", { name: /FAQ Bank/i }));
    expect(screen.getByText(/Private · Admins only/i)).toBeInTheDocument();

    // Add a private FAQ via AddFaqModal
    await user.click(screen.getByRole("button", { name: /Add FAQ/i }));
    const addFaqDialog = screen.getByRole("dialog");
    expect(within(addFaqDialog).getByText(/Private · Admins only/i)).toBeInTheDocument();
    await user.type(within(addFaqDialog).getByLabelText(/Question/i), "Do I need a Mac?");
    await user.type(
      within(addFaqDialog).getByLabelText(/Answer/i),
      "No, Windows and Linux work great.",
    );
    await user.click(within(addFaqDialog).getByRole("button", { name: /Save to FAQ Bank/i }));

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(
      within(screen.getByTestId("faq-bank-desktop-table")).getByText(
        "Do I need a Mac?",
      ),
    ).toBeInTheDocument();

    // Verify FAQ Bank stayed private (Home FAQ count unchanged!)
    const homeBeforePromote = await services.content.getSection("home");
    expect(homeBeforePromote.faq.items).toHaveLength(initialHomeFaqCount);
    expect(
      within(publishedKpi).getByText(new RegExp(`^${initialHomeFaqCount}\\s+on Home$`, "i")),
    ).toBeInTheDocument();

    // Promote one-way via Copy to Home FAQ
    const macRow = within(screen.getByTestId("faq-bank-desktop-table"))
      .getByText("Do I need a Mac?")
      .closest("tr")!;
    await user.click(within(macRow).getByRole("button", { name: /Copy to Home FAQ/i }));

    await waitFor(() =>
      expect(screen.getByText(/Copied to Home FAQ/i)).toBeInTheDocument(),
    );

    const homeAfterPromote = await services.content.getSection("home");
    expect(homeAfterPromote.faq.items).toHaveLength(initialHomeFaqCount + 1);
    expect(
      homeAfterPromote.faq.items.some((q) => q.question === "Do I need a Mac?"),
    ).toBe(true);
    expect(
      within(publishedKpi).getByText(
        new RegExp(`^${initialHomeFaqCount + 1}\\s+on Home$`, "i"),
      ),
    ).toBeInTheDocument();
  }, 15000);

  it("pre-populates AddFaqModal from an inquiry via Save to FAQ Bank and supports Edit/Delete FAQ Bank items", async () => {
    const user = userEvent.setup();
    const services = createMockServices();

    render(
      <AppDataProvider services={services} mode="mock">
        <InquiriesManager />
      </AppDataProvider>,
    );

    const detailPanel = await screen.findByTestId("inquiry-detail-panel");
    await user.click(
      within(detailPanel).getByRole("button", { name: /Save to FAQ Bank/i }),
    );

    const modal = screen.getByRole("dialog");
    expect(within(modal).getByLabelText(/Question/i)).toHaveValue(
      adminSeedJson.inquiries[0].question,
    );
    await user.type(
      within(modal).getByLabelText(/Answer/i),
      "It is a student software sandbox.",
    );
    await user.click(within(modal).getByRole("button", { name: /Save to FAQ Bank/i }));

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );

    await user.click(screen.getByRole("tab", { name: /FAQ Bank/i }));
    const faqRow = within(screen.getByTestId("faq-bank-desktop-table"))
      .getByText(adminSeedJson.inquiries[0].question)
      .closest("tr")!;

    // Edit FAQ
    await user.click(within(faqRow).getByRole("button", { name: /Edit/i }));
    const editModal = screen.getByRole("dialog");
    const answerField = within(editModal).getByLabelText(/Answer/i);
    await user.clear(answerField);
    await user.type(answerField, "Updated private answer.");
    await user.click(within(editModal).getByRole("button", { name: /Save to FAQ Bank/i }));

    await waitFor(() =>
      expect(
        within(screen.getByTestId("faq-bank-desktop-table")).getByText(
          "Updated private answer.",
        ),
      ).toBeInTheDocument(),
    );

    // Delete FAQ with confirmation
    const updatedRow = within(screen.getByTestId("faq-bank-desktop-table"))
      .getByText(adminSeedJson.inquiries[0].question)
      .closest("tr")!;
    await user.click(within(updatedRow).getByRole("button", { name: /Delete/i }));
    const confirmModal = screen.getByRole("dialog");
    await user.click(
      within(confirmModal).getByRole("button", { name: /Confirm Delete/i }),
    );

    await waitFor(() =>
      expect(
        within(screen.getByTestId("faq-bank-desktop-table")).queryByText(
          adminSeedJson.inquiries[0].question,
        ),
      ).not.toBeInTheDocument(),
    );
  });

  it("renders AdminEventsPage and AdminInquiriesPage inside AdminShell when authenticated", async () => {
    const services = createMockServices();
    await services.auth.login({
      email: "admin@muictdev.club",
      password: "password123",
      confirmPassword: "password123",
    });

    mockPathname = "/admin/events";
    const { unmount } = render(
      <AppDataProvider services={services} mode="mock">
        <AdminEventsPage />
      </AppDataProvider>,
    );

    expect(
      await screen.findByRole("heading", { name: /Events & News Management/i }),
    ).toBeInTheDocument();
    const eventsNav = screen.getByRole("navigation", { name: /admin navigation/i });
    expect(within(eventsNav).getByRole("link", { name: /Events/i })).toHaveAttribute(
      "aria-current",
      "page",
    );
    unmount();

    mockPathname = "/admin/inquiries";
    render(
      <AppDataProvider services={services} mode="mock">
        <AdminInquiriesPage />
      </AppDataProvider>,
    );

    expect(
      await screen.findByRole("heading", { name: /Inquiries & FAQ Tracker/i }),
    ).toBeInTheDocument();
    const inqNav = screen.getByRole("navigation", { name: /admin navigation/i });
    expect(within(inqNav).getByRole("link", { name: /Inquiries/i })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
