import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import HomePage from "@/app/page";
import homeJson from "@/content/home.json";
import { AppDataProvider } from "@/context/AppDataContext";
import { createMockServices } from "@/lib/services/mockAdapter";
import { clearAllFiles } from "@/lib/storage/indexedDbFiles";
import { clearAllOverlays } from "@/lib/storage/localOverlay";
import { homeContentSchema } from "@/lib/types/content";

describe("User Home page (/)", () => {
  beforeEach(async () => {
    localStorage.clear();
    clearAllOverlays();
    await clearAllFiles();
  });

  it("renders JSON-driven sections, anchor scroll offsets, and only Published + showOnHome Timeline events", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <AppDataProvider>
        <HomePage />
      </AppDataProvider>,
    );

    // Navbar & Hero
    expect(await screen.findByText(/They were wrong!_/i)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: /<Learn\. Hack\. Deliver\. \/>/i }),
    ).toBeInTheDocument();
    expect(screen.getByAltText(homeJson.hero.mascotImage.alt)).toBeInTheDocument();
    expect(screen.getByAltText(homeJson.hero.heroArtwork.alt)).toBeInTheDocument();

    // Why Us 3 cards & Teams 5 rows
    expect(screen.getByText("ACADEMIC GROWTH")).toBeInTheDocument();
    expect(screen.getByText("EXPANDED COMMUNITY")).toBeInTheDocument();
    expect(screen.getByText("ENHANCED EXPERIENCE")).toBeInTheDocument();
    expect(screen.getByText("FRONTEND WEB")).toBeInTheDocument();
    expect(screen.getByText("Quality Assurance")).toBeInTheDocument();
    const teamsSection = container.querySelector("#teams") as HTMLElement;
    expect(teamsSection).not.toBeNull();
    expect(within(teamsSection).getByText("Tools: React, Next.js")).toBeInTheDocument();

    // Anchor sections carry scroll-mt-28
    for (const id of ["about", "why-us", "teams", "timeline", "location", "faq"]) {
      const section = container.querySelector(`#${id}`);
      expect(section, `Missing section #${id}`).not.toBeNull();
      expect(section).toHaveClass("scroll-mt-28");
    }

    // Location external map link
    const mapLink = screen.getByRole("link", { name: /Open in Map/i });
    expect(mapLink).toHaveAttribute("href", homeJson.location.mapUrl);
    expect(mapLink).toHaveAttribute("target", "_blank");
    expect(mapLink).toHaveAttribute("rel", expect.stringContaining("noopener"));

    // Timeline filtering: zero placeholder text, only Published + showOnHome items
    expect(screen.queryByText(/Help Dogs/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Design Systems & Figma Handoff Clinic/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Backend Architecture & Cloud Deployment/i),
    ).not.toBeInTheDocument();

    const detailButtons = screen.getAllByRole("button", { name: /view details/i });
    expect(detailButtons).toHaveLength(5);

    // Click first event (has coverImage) -> opens EventDetailModal
    await user.click(detailButtons[0]);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(
      within(dialog).getByText("First Meet & Club Onboarding"),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText("IT-105 Auditorium, Faculty of ICT"),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByAltText(
        "Faculty of ICT Building, Mahidol University Salaya Campus",
      ),
    ).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // Click third event (no coverImage) -> opens cleanly without image errors
    await user.click(screen.getAllByRole("button", { name: /view details/i })[2]);
    const workshopDialog = screen.getByRole("dialog");
    expect(
      within(workshopDialog).getByText("Modern Web & Next.js Workshop"),
    ).toBeInTheDocument();
    expect(
      within(workshopDialog).getByText("Lab IT-302, Faculty of ICT"),
    ).toBeInTheDocument();
  });

  it("toggles FAQ accordion items with first item expanded by default", async () => {
    const user = userEvent.setup();
    render(
      <AppDataProvider>
        <HomePage />
      </AppDataProvider>,
    );

    const firstFaqBtn = await screen.findByRole("button", {
      name: /What is this club\?/i,
    });
    const secondFaqBtn = screen.getByRole("button", {
      name: /How can I join MUICT Dev Club\?/i,
    });

    expect(firstFaqBtn).toHaveAttribute("aria-expanded", "true");
    expect(secondFaqBtn).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.getByText(/Alongside developers, we welcome Quality Assurance/i),
    ).toBeVisible();

    await user.click(secondFaqBtn);
    expect(secondFaqBtn).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByText(/submit your application form when applications are open/i),
    ).toBeVisible();

    await user.click(firstFaqBtn);
    expect(firstFaqBtn).toHaveAttribute("aria-expanded", "false");
  });

  it("blocks Ask MUICT Dev Club submission without valid fields or PDPA consent and submits cleanly when checked", async () => {
    const user = userEvent.setup();
    const services = createMockServices();
    render(
      <AppDataProvider services={services}>
        <HomePage />
      </AppDataProvider>,
    );

    await user.click(
      await screen.findByRole("button", { name: /Ask us Question/i }),
    );
    const dialog = screen.getByRole("dialog", { name: /Ask MUICT Dev Club/i });

    // Empty submit validates fields & consent
    await user.click(
      within(dialog).getByRole("button", { name: /Send Question/i }),
    );
    expect(within(dialog).getByText(/please enter your question/i)).toBeInTheDocument();
    expect(
      within(dialog).getByText(/please enter a valid email/i),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText(/pdpa consent is required/i),
    ).toBeInTheDocument();

    // Fill question and invalid email -> blocks on invalid email
    await user.type(
      within(dialog).getByLabelText(/^Question/i),
      "Can first-year DST join?",
    );
    await user.type(
      within(dialog).getByLabelText(/Sender Email/i),
      "invalid-email",
    );
    await user.click(
      within(dialog).getByRole("button", { name: /Send Question/i }),
    );
    expect(
      within(dialog).getByText(/please enter a valid email/i),
    ).toBeInTheDocument();

    // Fix email without PDPA consent -> still blocked on consent
    await user.clear(within(dialog).getByLabelText(/Sender Email/i));
    await user.type(
      within(dialog).getByLabelText(/Sender Email/i),
      "6981234@student.mahidol.ac.th",
    );
    await user.click(
      within(dialog).getByRole("button", { name: /Send Question/i }),
    );
    expect(
      within(dialog).getByText(/pdpa consent is required/i),
    ).toBeInTheDocument();

    // Check PDPA consent and submit
    await user.click(within(dialog).getByRole("checkbox"));
    await user.click(
      within(dialog).getByRole("button", { name: /Send Question/i }),
    );

    await waitFor(() =>
      expect(
        within(dialog).getByText(/question received|thank you/i),
      ).toBeInTheDocument(),
    );
    expect(
      within(dialog).getByText(homeJson.faq.askModal.successMessage),
    ).toBeInTheDocument();

    const inquiries = await services.inquiries.listInquiries();
    expect(inquiries[0]).toMatchObject({
      question: "Can first-year DST join?",
      senderEmail: "6981234@student.mahidol.ac.th",
      category: "Recruitment",
      status: "Unanswered",
    });
  });

  it("renders updated copy from JSON content service without hardcoded fallback", async () => {
    const services = createMockServices();
    const updatedHome = homeContentSchema.parse({
      ...homeJson,
      hero: {
        ...homeJson.hero,
        headline: "<Build. Test. Ship. />",
      },
      about: {
        ...homeJson.about,
        emphasis: "Proven in production!_",
      },
    });
    await services.content.updateSection("home", updatedHome);

    render(
      <AppDataProvider services={services}>
        <HomePage />
      </AppDataProvider>,
    );

    expect(
      await screen.findByRole("heading", { level: 1, name: /<Build\. Test\. Ship\. \/>/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Proven in production!_")).toBeInTheDocument();
  });
});
