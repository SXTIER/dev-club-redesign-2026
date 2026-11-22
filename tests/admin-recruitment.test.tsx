import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminRecruitmentPage from "@/app/admin/recruitment/page";
import { RecruitmentManager } from "@/components/admin/RecruitmentManager";
import { AppDataProvider } from "@/context/AppDataContext";
import adminSeedJson from "@/content/admin-seed.json";
import { ApiError } from "@/lib/services/contracts";
import { createMockServices } from "@/lib/services/mockAdapter";
import { clearAllFiles } from "@/lib/storage/indexedDbFiles";
import { clearAllOverlays } from "@/lib/storage/localOverlay";
import type { RecruitmentApplication } from "@/lib/types/recruitment";
import { buildApplicationsCsv } from "@/lib/utils/csvExport";

const mockPush = vi.fn();
const mockReplace = vi.fn();
let mockPathname = "/admin/recruitment";

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

function readBlobAsText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () =>
      reject(reader.error ?? new Error("Failed to read Blob as text"));
    reader.readAsText(blob);
  });
}

describe("Admin Recruitment Checklist (/admin/recruitment) & CSV export", () => {
  let restoreObjectUrls: (() => void) | null = null;

  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    clearAllOverlays();
    await clearAllFiles();
    mockPush.mockReset();
    mockReplace.mockReset();
    mockPathname = "/admin/recruitment";
  });

  afterEach(() => {
    restoreObjectUrls?.();
    restoreObjectUrls = null;
    vi.restoreAllMocks();
  });

  it("escapes quotes/newlines and neutralizes CSV formula injection prefixes (Review Focus #5)", () => {
    const maliciousApp: RecruitmentApplication = {
      id: "APP-2026-9001",
      createdAt: "2026-11-14T09:00:00.000Z",
      status: "Pending",
      personal: {
        firstName: "=CMD()",
        lastName: 'O"Brien, Jr.',
        nickname: "+hack",
        studentId: "6987777",
        email: "a@student.mahidol.ac.th",
        phone: "0891234567",
        program: "DST",
        year: "1",
      },
      team: "projects",
      roleId: "frontend-dev",
      roleLabel: "-1+1",
      customRole: "@SUM(A1)",
      motivation: {
        expectation: "line1\nline2",
        contribution: " =CMD()",
        projectIdea: "\t+cmd",
        teamExperience: "\r-evil",
      },
      portfolioUrl: "https://github.com/example",
      cv: {
        fileRef: "idb://cv-1",
        filename: "resume.pdf",
        mimeType: "application/pdf",
        sizeBytes: 2048,
      },
      agreedRequirements: true,
      agreedPdpa: true,
    };

    const csv = buildApplicationsCsv([maliciousApp]);
    const headerLine = csv.split("\r\n")[0];
    expect(headerLine).toBe(
      "Application ID,Submitted At,Status,Student ID,First Name,Last Name,Nickname,Email,Phone,Program,Year,Team,Role,Custom Role,Expectation,Contribution,Project Idea,Team Experience,Portfolio URL,CV Filename",
    );

    expect(csv).toContain(`"'=CMD()"`);
    expect(csv).toContain(`"O""Brien, Jr."`);
    expect(csv).toContain(`"'+hack"`);
    expect(csv).toContain(`"'-1+1"`);
    expect(csv).toContain(`"'@SUM(A1)"`);
    expect(csv).toContain(`"' =CMD()"`);
    expect(csv).toContain(`"'\t+cmd"`);
    expect(csv).toContain(`"'\r-evil"`);
    expect(csv).toContain(`"line1\nline2"`);
    expect(csv).toContain(`"resume.pdf"`);
  });

  it("renders KPIs, toggles Recruitment Open/Closed, filters dynamically by status/role/search, exports filtered CSV, and updates status in View Form modal", async () => {
    const user = userEvent.setup();
    const services = createMockServices();

    // Add an extra application with a distinct roleLabel not present in recruitment.json
    await services.recruitment.submitApplication({
      personal: {
        firstName: "Boon",
        lastName: "Tester",
        nickname: "Boon",
        studentId: "6887999",
        email: "boon.tes@student.mahidol.ac.th",
        phone: "0899998888",
        program: "ICT",
        year: "2",
      },
      team: "projects",
      roleId: "legacy-ai",
      roleLabel: "AI Prompt Engineer",
      motivation: {
        expectation: "Learn club workflows",
        contribution: "Prompt tooling",
        projectIdea: "Campus assistant",
        teamExperience: "Hackathon team",
      },
      agreedRequirements: true,
      agreedPdpa: true,
    });

    render(
      <AppDataProvider services={services} mode="mock">
        <RecruitmentManager />
      </AppDataProvider>,
    );

    const desktopTable = await screen.findByTestId("recruitment-desktop-table");
    const mobileCards = screen.getByTestId("recruitment-mobile-cards");
    expect(within(desktopTable).getByText("Somchai Narin")).toBeInTheDocument();
    expect(within(mobileCards).getByText("Somchai Narin")).toBeInTheDocument();

    // Seed has 6 (2 Pending, 3 Accepted, 1 Rejected) + 1 submitted Pending = 7 total, 3 Pending, 3 Accepted, 1 Rejected
    expect(
      await within(screen.getByTestId("kpi-total")).findByText("7"),
    ).toBeInTheDocument();
    expect(within(screen.getByTestId("kpi-pending")).getByText("3")).toBeInTheDocument();
    expect(within(screen.getByTestId("kpi-accepted")).getByText("3")).toBeInTheDocument();
    expect(within(screen.getByTestId("kpi-rejected")).getByText("1")).toBeInTheDocument();

    // Toggle Recruitment Open/Closed switch and verify services.content flips
    const intakeSwitch = screen.getByRole("switch");
    expect(intakeSwitch).toHaveAttribute("aria-checked", "true");
    await user.click(intakeSwitch);
    await waitFor(() =>
      expect(intakeSwitch).toHaveAttribute("aria-checked", "false"),
    );
    expect((await services.content.getSection("recruitment")).isOpen).toBe(false);

    await user.click(intakeSwitch);
    await waitFor(() =>
      expect(intakeSwitch).toHaveAttribute("aria-checked", "true"),
    );
    expect((await services.content.getSection("recruitment")).isOpen).toBe(true);

    // Dynamic role select includes recruitment.json roles AND distinct roleLabel from applications
    const roleSelect = screen.getByRole("combobox", { name: /Position|Role/i });
    expect(
      within(roleSelect).getByRole("option", { name: "Front End Developer" }),
    ).toBeInTheDocument();
    expect(
      within(roleSelect).getByRole("option", { name: "AI Prompt Engineer" }),
    ).toBeInTheDocument();

    // Filter by status = Pending
    await user.click(screen.getByRole("button", { name: /^Pending\s*\(/i }));
    expect(within(desktopTable).getByText("Somchai Narin")).toBeInTheDocument();
    expect(
      within(desktopTable).queryByText("Napat Kittipong"),
    ).not.toBeInTheDocument();

    // Filter by role = Front End Developer
    await user.selectOptions(roleSelect, "Front End Developer");
    expect(within(desktopTable).getByText("Somchai Narin")).toBeInTheDocument();
    expect(within(desktopTable).queryByText("Boon Tester")).not.toBeInTheDocument();

    // Search by student ID / nickname / email / custom role
    await user.click(screen.getByRole("button", { name: /^All\s*\(/i }));
    await user.selectOptions(roleSelect, "all");
    const searchInput = screen.getByRole("searchbox", {
      name: /Search applications/i,
    });
    await user.type(searchInput, "Quality Assurance");
    expect(
      within(desktopTable).getByText("Kanya Rattanakul"),
    ).toBeInTheDocument();
    expect(
      within(desktopTable).queryByText("Somchai Narin"),
    ).not.toBeInTheDocument();

    // Export CSV exports currently filtered applications (only Kanya Rattanakul)
    const { createSpy, revokeSpy, restore } = stubObjectUrlFns();
    restoreObjectUrls = restore;
    createSpy.mockReturnValue("blob:apps-csv");
    const anchorClickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    await user.click(screen.getByRole("button", { name: /Export CSV/i }));
    expect(createSpy).toHaveBeenCalledTimes(1);
    const exportedBlob = createSpy.mock.calls[0][0] as Blob;
    const exportedText = await readBlobAsText(exportedBlob);
    expect(exportedText).toContain("Kanya");
    expect(exportedText).not.toContain("Somchai");
    expect(anchorClickSpy).toHaveBeenCalledTimes(1);
    expect(revokeSpy).toHaveBeenCalledWith("blob:apps-csv");

    // Clear search, open View Form for Somchai Narin, update status to Accepted, and close with Done
    await user.clear(searchInput);
    const somchaiRow = within(desktopTable)
      .getByText("Somchai Narin")
      .closest("tr")!;
    await user.click(within(somchaiRow).getByRole("button", { name: /View Form/i }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Application Details")).toBeInTheDocument();
    expect(
      within(dialog).getByText(/01\s*[·-]\s*Personal & Student Information/i),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText(/02\s*[·-]\s*Role & Focus/i),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText(/03\s*[·-]\s*Motivation, Experience/i),
    ).toBeInTheDocument();
    expect(within(dialog).getAllByText("6987777").length).toBeGreaterThan(0);
    expect(
      within(dialog).getByText("somchai.nar@student.mahidol.ac.th"),
    ).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: /^Accepted$/i }));
    await waitFor(async () => {
      const apps = await services.recruitment.listApplications();
      const somchai = apps.find((a) => a.id === adminSeedJson.applications[0].id);
      expect(somchai?.status).toBe("Accepted");
    });

    expect(within(screen.getByTestId("kpi-accepted")).getByText("4")).toBeInTheDocument();
    expect(within(screen.getByTestId("kpi-pending")).getByText("2")).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: /^Done$/i }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  }, 15000);

  it("opens PDF CVs in a new tab, downloads DOCX CVs, surfaces getCvDownloadUrl errors, and blocks unsafe portfolio URLs", async () => {
    const user = userEvent.setup();
    const services = createMockServices();
    const { createSpy, restore } = stubObjectUrlFns();
    restoreObjectUrls = restore;
    createSpy.mockImplementation((blob) =>
      (blob as Blob).type.includes("pdf") ? "blob:cv-pdf" : "blob:cv-docx",
    );

    await services.recruitment.submitApplication(
      {
        personal: {
          firstName: "Pdf",
          lastName: "Applicant",
          nickname: "Pdf",
          studentId: "6988111",
          email: "pdf.app@student.mahidol.ac.th",
          phone: "0811112222",
          program: "DST",
          year: "1",
        },
        team: "projects",
        roleId: "frontend-dev",
        roleLabel: "Front End Developer",
        motivation: {
          expectation: "Exp",
          contribution: "Con",
          projectIdea: "Idea",
          teamExperience: "Team",
        },
        portfolioUrl: "javascript:alert(1)",
        agreedRequirements: true,
        agreedPdpa: true,
      },
      new File(["%PDF-1.4"], "pdf-applicant.pdf", { type: "application/pdf" }),
    );

    await services.recruitment.submitApplication(
      {
        personal: {
          firstName: "Docx",
          lastName: "Applicant",
          nickname: "Docx",
          studentId: "6988222",
          email: "docx.app@student.mahidol.ac.th",
          phone: "0822223333",
          program: "ICT",
          year: "2",
        },
        team: "marketing",
        roleId: "content-creator",
        roleLabel: "Content Creator",
        motivation: {
          expectation: "Exp",
          contribution: "Con",
          projectIdea: "Idea",
          teamExperience: "Team",
        },
        portfolioUrl: "https://github.com/docx-app",
        agreedRequirements: true,
        agreedPdpa: true,
      },
      new File(["PK-docx"], "docx-applicant.docx", {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      }),
    );

    const openSpy = vi.spyOn(window, "open").mockReturnValue({} as Window);
    const anchorClickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    render(
      <AppDataProvider services={services} mode="mock">
        <RecruitmentManager />
      </AppDataProvider>,
    );

    const desktopTable = await screen.findByTestId("recruitment-desktop-table");

    // 1) PDF CV opens in a new tab & unsafe portfolioUrl is NOT an <a> link
    const pdfCell = await within(desktopTable).findByText("Pdf Applicant");
    const pdfRow = pdfCell.closest("tr")!;
    await user.click(within(pdfRow).getByRole("button", { name: /View Form/i }));

    let dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("pdf-applicant.pdf")).toBeInTheDocument();
    expect(
      within(dialog).queryByRole("link", { name: /javascript:alert/i }),
    ).not.toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: /View File/i }));
    await waitFor(() =>
      expect(openSpy).toHaveBeenCalledWith(
        "blob:cv-pdf",
        "_blank",
        "noopener,noreferrer",
      ),
    );
    await user.click(within(dialog).getByRole("button", { name: /^Done$/i }));

    // 2) DOCX CV triggers <a download> & valid https portfolioUrl renders safe link
    const docxRow = within(desktopTable)
      .getByText("Docx Applicant")
      .closest("tr")!;
    await user.click(within(docxRow).getByRole("button", { name: /View Form/i }));

    dialog = screen.getByRole("dialog");
    const portfolioLink = within(dialog).getByRole("link", {
      name: "https://github.com/docx-app",
    });
    expect(portfolioLink).toHaveAttribute("rel", "noopener noreferrer");

    await user.click(within(dialog).getByRole("button", { name: /View File/i }));
    await waitFor(() => expect(anchorClickSpy).toHaveBeenCalledTimes(1));
    expect(openSpy).toHaveBeenCalledTimes(1);

    // 3) Error surfaced inline if getCvDownloadUrl rejects
    vi.spyOn(services.recruitment, "getCvDownloadUrl").mockRejectedValueOnce(
      new ApiError(404, "CV_NOT_FOUND", "CV blob missing in storage."),
    );
    await user.click(within(dialog).getByRole("button", { name: /View File/i }));
    await waitFor(() =>
      expect(within(dialog).getByRole("alert")).toHaveTextContent(
        /CV blob missing in storage\./i,
      ),
    );
  });

  it("paginates when > 10 applicants exist and renders AdminRecruitmentPage inside AdminShell when authenticated", async () => {
    const user = userEvent.setup();
    const services = createMockServices();

    // Seed 6 additional applications (6 + 6 = 12 > PAGE_SIZE 10)
    for (let i = 1; i <= 6; i += 1) {
      await services.recruitment.submitApplication({
        personal: {
          firstName: `Paged${i}`,
          lastName: "Student",
          nickname: `P${i}`,
          studentId: `698000${i}`,
          email: `paged${i}@student.mahidol.ac.th`,
          phone: `081000000${i}`,
          program: "ICT",
          year: "1",
        },
        team: "marketing",
        roleId: "graphic-designer",
        roleLabel: "Graphic Designer",
        motivation: {
          expectation: "Exp",
          contribution: "Con",
          projectIdea: "Idea",
          teamExperience: "Team",
        },
        agreedRequirements: true,
        agreedPdpa: true,
      });
    }

    await services.auth.login({
      email: "admin@muictdev.club",
      password: "password123",
      confirmPassword: "password123",
    });

    render(
      <AppDataProvider services={services} mode="mock">
        <AdminRecruitmentPage />
      </AppDataProvider>,
    );

    expect(
      await screen.findByRole("heading", { name: /Recruitment Checklist/i }),
    ).toBeInTheDocument();
    const adminNav = screen.getByRole("navigation", {
      name: /admin navigation/i,
    });
    expect(
      within(adminNav).getByRole("link", { name: /Recruitment/i }),
    ).toHaveAttribute("aria-current", "page");

    expect(
      screen.getByRole("navigation", { name: /Pagination/i }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Next page/i }));
    expect(
      within(screen.getByTestId("recruitment-desktop-table")).getByText(
        "Thanawat Srisuk",
      ),
    ).toBeInTheDocument();
  });
});
