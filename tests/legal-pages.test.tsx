import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import AcknowledgementPage from "@/app/acknowledgement/page";
import PrivacyPolicyPage from "@/app/privacy-policy/page";
import TermsOfUsePage from "@/app/terms-of-use/page";
import legalJson from "@/content/legal.json";
import { AppDataProvider } from "@/context/AppDataContext";
import { createMockServices } from "@/lib/services/mockAdapter";
import { clearAllFiles } from "@/lib/storage/indexedDbFiles";
import { clearAllOverlays } from "@/lib/storage/localOverlay";
import { legalContentSchema } from "@/lib/types/content";

describe("User Legal pages (EN / TH)", () => {
  beforeEach(async () => {
    localStorage.clear();
    clearAllOverlays();
    await clearAllFiles();
  });

  it("defaults Privacy Policy to EN, sets article lang, and toggles cleanly to TH and back", async () => {
    const user = userEvent.setup();
    render(
      <AppDataProvider>
        <PrivacyPolicyPage />
      </AppDataProvider>,
    );

    const backLink = await screen.findByRole("link", {
      name: /Back to Home/i,
    });
    expect(backLink).toHaveAttribute("href", "/");
    expect(backLink).toHaveTextContent(legalJson.backToHomeLabel);

    expect(
      screen.getByRole("heading", { level: 1, name: /^Privacy Policy$/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(legalJson.privacyPolicy.en.subtitle)).toBeInTheDocument();
    expect(screen.getByText(legalJson.privacyPolicy.en.lastUpdated)).toBeInTheDocument();
    expect(screen.getByText("Collection of Personal Data")).toBeInTheDocument();
    expect(screen.getByText("Email Address")).toBeInTheDocument();

    const article = screen.getByRole("article");
    expect(article).toHaveAttribute("lang", "en");

    const enButton = screen.getByRole("button", { name: /^EN$/i });
    const thButton = screen.getByRole("button", { name: /^TH$/i });
    expect(enButton).toHaveAttribute("aria-pressed", "true");
    expect(thButton).toHaveAttribute("aria-pressed", "false");

    await user.click(thButton);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /นโยบายความเป็นส่วนตัวสำหรับลูกค้า/,
      }),
    ).toBeInTheDocument();
    expect(article).toHaveAttribute("lang", "th");
    expect(thButton).toHaveAttribute("aria-pressed", "true");
    expect(enButton).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("การเก็บรวบรวมข้อมูลส่วนบุคคล")).toBeInTheDocument();
    expect(screen.getByText("รหัสนักศึกษา")).toBeInTheDocument();

    await user.click(enButton);
    expect(
      screen.getByRole("heading", { level: 1, name: /^Privacy Policy$/i }),
    ).toBeInTheDocument();
    expect(article).toHaveAttribute("lang", "en");
  });

  it("renders Terms of Use in EN by default and toggles cleanly to TH", async () => {
    const user = userEvent.setup();
    render(
      <AppDataProvider>
        <TermsOfUsePage />
      </AppDataProvider>,
    );

    expect(
      await screen.findByRole("heading", { level: 1, name: /Terms of Use/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(legalJson.termsOfUse.en.subtitle),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Agreement to Terms and Conditions of Use"),
    ).toBeInTheDocument();

    const article = screen.getByRole("article");
    expect(article).toHaveAttribute("lang", "en");

    const thButton = screen.getByRole("button", { name: /^TH$/i });
    await user.click(thButton);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /ข้อกำหนดและเงื่อนไขการใช้งานของเว็บไซต์ MUICT Dev Club/,
      }),
    ).toBeInTheDocument();
    expect(article).toHaveAttribute("lang", "th");
    expect(
      screen.getByText("การเห็นด้วยในข้อกำหนดและเงื่อนไขการใช้งาน"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("เพื่อสร้างและจัดการบัญชีผู้ใช้งาน"),
    ).toBeInTheDocument();
  });

  it("renders Acknowledgement EN/TH toggle and developer credits from legal.json", async () => {
    const user = userEvent.setup();
    render(
      <AppDataProvider>
        <AcknowledgementPage />
      </AppDataProvider>,
    );

    expect(
      await screen.findByRole("heading", { level: 1, name: /^Acknowledgement$/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Poonyawatt Klumnaim")).toBeInTheDocument();
    expect(
      screen.getByText("Website Developer & Data Protection Contact"),
    ).toBeInTheDocument();
    expect(screen.getByText("Pakawat Sanboonsri")).toBeInTheDocument();
    expect(screen.getByText("Website Developer")).toBeInTheDocument();
    expect(screen.getAllByText("Faculty of ICT").length).toBeGreaterThanOrEqual(2);

    const backLink = screen.getByRole("link", { name: /Back to Home/i });
    expect(backLink).toHaveAttribute("href", "/");

    const article = screen.getByRole("article");
    expect(article).toHaveAttribute("lang", "en");

    await user.click(screen.getByRole("button", { name: /^TH$/i }));

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /กิตติกรรมประกาศ \(Acknowledgement\)/,
      }),
    ).toBeInTheDocument();
    expect(article).toHaveAttribute("lang", "th");
    expect(screen.getByText("ผู้ร่วมพัฒนาเว็บไซต์")).toBeInTheDocument();
    expect(screen.getByText("Poonyawatt Klumnaim")).toBeInTheDocument();
    expect(screen.getByText("Pakawat Sanboonsri")).toBeInTheDocument();
  });

  it("reflects dynamic JSON updates from the content service across legal pages", async () => {
    const user = userEvent.setup();
    const services = createMockServices();
    const updatedLegal = legalContentSchema.parse({
      ...legalJson,
      backToHomeLabel: "← Return Home",
      privacyPolicy: {
        en: {
          ...legalJson.privacyPolicy.en,
          title: "Updated Privacy Notice",
          lastUpdated: "Last updated: Dec 2026",
        },
        th: {
          ...legalJson.privacyPolicy.th,
          title: "ประกาศความเป็นส่วนตัวฉบับปรับปรุง",
        },
      },
      acknowledgement: {
        ...legalJson.acknowledgement,
        credits: [
          ...legalJson.acknowledgement.credits,
          {
            name: "Nattapong Chaiyawat",
            affiliation: "MUICT Alumni",
            role: "Advisor",
          },
        ],
      },
    });
    await services.content.updateSection("legal", updatedLegal);

    const { unmount } = render(
      <AppDataProvider services={services}>
        <PrivacyPolicyPage />
      </AppDataProvider>,
    );

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: /Updated Privacy Notice/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Last updated: Dec 2026")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Return Home/i }),
    ).toHaveAttribute("href", "/");

    await user.click(screen.getByRole("button", { name: /^TH$/i }));
    await waitFor(() =>
      expect(
        screen.getByRole("heading", {
          level: 1,
          name: /ประกาศความเป็นส่วนตัวฉบับปรับปรุง/,
        }),
      ).toBeInTheDocument(),
    );

    unmount();

    render(
      <AppDataProvider services={services}>
        <AcknowledgementPage />
      </AppDataProvider>,
    );

    expect(
      await screen.findByText("Nattapong Chaiyawat"),
    ).toBeInTheDocument();
    expect(screen.getByText("MUICT Alumni")).toBeInTheDocument();
    expect(screen.getByText("Advisor")).toBeInTheDocument();
  });
});
