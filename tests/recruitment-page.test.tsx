import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import JoiningInformationPage from "@/app/joining-information/page";
import RecruitmentClosedView from "@/components/recruitment/RecruitmentClosedView";
import RecruitmentOpenedForm from "@/components/recruitment/RecruitmentOpenedForm";
import recruitmentJson from "@/content/recruitment.json";
import { AppDataProvider } from "@/context/AppDataContext";
import { createMockServices } from "@/lib/services/mockAdapter";
import { clearAllFiles } from "@/lib/storage/indexedDbFiles";
import { clearAllOverlays } from "@/lib/storage/localOverlay";
import { recruitmentContentSchema } from "@/lib/types/content";

let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
}));

describe("Recruitment page (/joining-information)", () => {
  beforeEach(async () => {
    localStorage.clear();
    clearAllOverlays();
    await clearAllFiles();
    mockSearchParams = new URLSearchParams();
  });

  it("renders Closed state copy from recruitment.json", () => {
    render(
      <AppDataProvider>
        <RecruitmentClosedView content={recruitmentJson} />
      </AppDataProvider>,
    );

    expect(
      screen.getByText(/MUICT DEV CLUB\s*\/\s*JOINING INFORMATION/i),
    ).toBeInTheDocument();
    expect(screen.getByText(recruitmentJson.banner.headline)).toBeInTheDocument();
    expect(screen.getByText(recruitmentJson.closedCopy.eyebrow)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: /Applications are currently closed/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(recruitmentJson.closedCopy.description)).toBeInTheDocument();
    const backLink = screen.getByRole("link", {
      name: new RegExp(recruitmentJson.closedCopy.ctaLabel, "i"),
    });
    expect(backLink).toHaveAttribute("href", recruitmentJson.closedCopy.ctaHref);
  });

  it("validates required fields and blocks submission until valid", async () => {
    const user = userEvent.setup();
    render(
      <AppDataProvider>
        <RecruitmentOpenedForm content={recruitmentJson} />
      </AppDataProvider>,
    );

    await user.click(screen.getByRole("button", { name: /Submit Application/i }));

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/First name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Student ID must be exactly 7 digits/i)).toBeInTheDocument();
    expect(screen.getByText(/Phone number must be 10 digits starting with 0/i)).toBeInTheDocument();
    expect(screen.getByText(/Please select a role/i)).toBeInTheDocument();
    expect(screen.getByText(/Expectation is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Requirements agreement is required/i)).toBeInTheDocument();
    expect(screen.getByText(/PDPA confirmation is required/i)).toBeInTheDocument();

    // Check custom validation on malformed Student ID, Phone, Email, Portfolio URL
    await user.type(screen.getByLabelText(/Student ID/i), "123");
    await user.type(screen.getByLabelText(/^Email/i), "not-an-email");
    await user.type(screen.getByLabelText(/Phone/i), "9812345678");
    await user.type(screen.getByLabelText(/Portfolio Link/i), "ftp://bad-url");
    await user.click(screen.getByRole("button", { name: /Submit Application/i }));

    expect(screen.getByText(/Student ID must be exactly 7 digits/i)).toBeInTheDocument();
    expect(screen.getByText(/Valid email address is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Phone number must be 10 digits starting with 0/i)).toBeInTheDocument();
    expect(screen.getByText(/valid http:\/\/ or https:\/\/ URL/i)).toBeInTheDocument();
  });

  it(
    "rejects invalid CV file type while preserving form values, then submits valid form + PDF CV (Review Focus #2)",
    async () => {
      const user = userEvent.setup({ applyAccept: false });
    const services = createMockServices();
    render(
      <AppDataProvider services={services}>
        <RecruitmentOpenedForm content={recruitmentJson} />
      </AppDataProvider>,
    );

    await user.type(screen.getByLabelText(/First Name/i), "Somchai");
    await user.type(screen.getByLabelText(/Last Name/i), "Narin");
    await user.type(screen.getByLabelText(/NickName/i), "Chai");
    await user.type(screen.getByLabelText(/Student ID/i), "6987777");
    await user.type(screen.getByLabelText(/^Email/i), "6987777@student.mahidol.ac.th");
    await user.type(screen.getByLabelText(/Phone/i), "0812345678");
    await user.selectOptions(screen.getByLabelText(/Program/i), "DST");
    await user.selectOptions(screen.getByLabelText(/Year/i), "1");
    await user.click(screen.getByRole("radio", { name: /Front End Developer/i }));
    await user.type(screen.getByLabelText(/Expectation/i), "Build real web apps");
    await user.type(screen.getByLabelText(/Contribution/i), "Frontend UI");
    await user.type(screen.getByLabelText(/Project Idea/i), "Club portal");
    await user.type(screen.getByLabelText(/Team Project Experience/i), "ICT course project");

    // Attempt invalid CV file -> error shown, First Name & other inputs preserved
    const fileInput = screen.getByLabelText(/Upload CV/i) as HTMLInputElement;
    await user.upload(
      fileInput,
      new File(["bad"], "malware.exe", { type: "application/x-msdownload" }),
    );
    expect(
      screen.getByText(/Unsupported cv file extension\. Allowed: \.pdf, \.docx\./i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/First Name/i)).toHaveValue("Somchai");
    expect(screen.getByLabelText(/Student ID/i)).toHaveValue("6987777");
    expect(screen.getByRole("radio", { name: /Front End Developer/i })).toBeChecked();

    // Attempt oversized PDF CV (> 10 MB) -> error shown, form preserved
    const bigPdf = new File(["x"], "huge.pdf", { type: "application/pdf" });
    Object.defineProperty(bigPdf, "size", { value: 11 * 1024 * 1024 });
    await user.upload(fileInput, bigPdf);
    expect(screen.getByText(/10 MB/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/First Name/i)).toHaveValue("Somchai");

    // Upload valid DOCX CV, remove it, then upload valid PDF CV + check both agreements + submit
    await user.upload(
      fileInput,
      new File(["docx"], "draft.docx", {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      }),
    );
    expect(screen.getByText("draft.docx")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Remove CV/i }));
    expect(screen.queryByText("draft.docx")).not.toBeInTheDocument();

    await user.upload(
      fileInput,
      new File(["%PDF-1.4"], "somchai.pdf", { type: "application/pdf" }),
    );
    expect(screen.getByText("somchai.pdf")).toBeInTheDocument();

    for (const cb of screen.getAllByRole("checkbox")) {
      await user.click(cb);
    }
    await user.click(screen.getByRole("button", { name: /Submit Application/i }));

    await waitFor(() => expect(screen.getByText(/Pending/i)).toBeInTheDocument());
    expect(screen.getByText(recruitmentJson.successCopy.title)).toBeInTheDocument();
    expect(screen.getByText(/APP-\d{4}-\d{4}/)).toBeInTheDocument();
    expect(screen.getByText(/Somchai Narin/)).toBeInTheDocument();
    expect(screen.getByText(/Front End Developer/)).toBeInTheDocument();
    expect(screen.getByText(/somchai\.pdf/)).toBeInTheDocument();

    const stored = await services.recruitment.listApplications();
    expect(stored[0]).toMatchObject({
      status: "Pending",
      team: "projects",
      roleId: "frontend-dev",
      roleLabel: "Front End Developer",
      personal: {
        firstName: "Somchai",
        lastName: "Narin",
        studentId: "6987777",
      },
      cv: {
        filename: "somchai.pdf",
      },
    });
  }, 15000);

  it(
    "reveals required Custom Role input when Other is selected and stores customRole on submit",
    async () => {
    const user = userEvent.setup();
    const services = createMockServices();
    render(
      <AppDataProvider services={services}>
        <RecruitmentOpenedForm content={recruitmentJson} />
      </AppDataProvider>,
    );

    await user.type(screen.getByLabelText(/First Name/i), "Kanya");
    await user.type(screen.getByLabelText(/Last Name/i), "Rattanakul");
    await user.type(screen.getByLabelText(/NickName/i), "Kan");
    await user.type(screen.getByLabelText(/Student ID/i), "6987059");
    await user.type(screen.getByLabelText(/^Email/i), "kanya.rat@student.mahidol.ac.th");
    await user.type(screen.getByLabelText(/Phone/i), "0867890123");
    await user.selectOptions(screen.getByLabelText(/Program/i), "ICT");
    await user.selectOptions(screen.getByLabelText(/Year/i), "1");

    const projectsGroup = screen.getByRole("group", { name: /Projects Team/i });
    await user.click(within(projectsGroup).getByRole("radio", { name: /Other/i }));

    const customRoleInput = screen.getByLabelText(/Custom Role/i);
    expect(customRoleInput).toBeInTheDocument();

    await user.type(screen.getByLabelText(/Expectation/i), "Learn automated testing");
    await user.type(screen.getByLabelText(/Contribution/i), "Write Playwright tests");
    await user.type(screen.getByLabelText(/Project Idea/i), "Regression checklist");
    await user.type(screen.getByLabelText(/Team Project Experience/i), "Freshman showcase");

    for (const cb of screen.getAllByRole("checkbox")) {
      await user.click(cb);
    }

    // Submit with blank custom role -> blocked
    await user.click(screen.getByRole("button", { name: /Submit Application/i }));
    expect(screen.getByText(/Please specify your desired role/i)).toBeInTheDocument();

    // Fill custom role and submit -> succeeds
    await user.type(customRoleInput, "Quality Assurance");
    await user.click(screen.getByRole("button", { name: /Submit Application/i }));

    await waitFor(() => expect(screen.getByText(/Pending/i)).toBeInTheDocument());
    expect(screen.getByText(/Quality Assurance/)).toBeInTheDocument();

    const stored = await services.recruitment.listApplications();
    expect(stored[0]).toMatchObject({
      team: "projects",
      roleId: "projects-other",
      roleLabel: "Other",
      customRole: "Quality Assurance",
    });
  }, 15000);

  it(
    "allows dismissing CV error or submitting without CV after a rejected optional CV attempt",
    async () => {
      const user = userEvent.setup({ applyAccept: false });
      const services = createMockServices();
      render(
        <AppDataProvider services={services}>
          <RecruitmentOpenedForm content={recruitmentJson} />
        </AppDataProvider>,
      );

      await user.type(screen.getByLabelText(/First Name/i), "Niran");
      await user.type(screen.getByLabelText(/Last Name/i), "Sombat");
      await user.type(screen.getByLabelText(/NickName/i), "Ran");
      await user.type(screen.getByLabelText(/Student ID/i), "6988123");
      await user.type(screen.getByLabelText(/^Email/i), "niran.som@student.mahidol.ac.th");
      await user.type(screen.getByLabelText(/Phone/i), "0891234567");
      await user.selectOptions(screen.getByLabelText(/Program/i), "DST");
      await user.selectOptions(screen.getByLabelText(/Year/i), "2");
      await user.click(screen.getByRole("radio", { name: /Back End Developer/i }));
      await user.type(screen.getByLabelText(/Expectation/i), "Build scalable APIs");
      await user.type(screen.getByLabelText(/Contribution/i), "Maintain services");
      await user.type(screen.getByLabelText(/Project Idea/i), "Event check-in API");
      await user.type(screen.getByLabelText(/Team Project Experience/i), "Database group project");

      const fileInput = screen.getByLabelText(/Upload CV/i) as HTMLInputElement;
      await user.upload(
        fileInput,
        new File(["bad"], "script.sh", { type: "text/x-shellscript" }),
      );
      expect(
        screen.getByText(/Unsupported cv file extension\. Allowed: \.pdf, \.docx\./i),
      ).toBeInTheDocument();

      // Dismiss button clears the error cleanly
      await user.click(screen.getByRole("button", { name: /Dismiss CV error/i }));
      expect(
        screen.queryByText(/Unsupported cv file extension/i),
      ).not.toBeInTheDocument();

      // Even if an invalid CV error is left displayed without attaching a file, submit succeeds without CV
      await user.upload(
        fileInput,
        new File(["bad"], "script.sh", { type: "text/x-shellscript" }),
      );
      expect(
        screen.getByText(/Unsupported cv file extension/i),
      ).toBeInTheDocument();

      for (const cb of screen.getAllByRole("checkbox")) {
        await user.click(cb);
      }
      await user.click(screen.getByRole("button", { name: /Submit Application/i }));

      await waitFor(() => expect(screen.getByText(/Pending/i)).toBeInTheDocument());
      const stored = await services.recruitment.listApplications();
      expect(stored[0].personal.firstName).toBe("Niran");
      expect(stored[0].cv).toBeUndefined();
    },
    15000,
  );

  it("supports ?preview=closed and ?preview=open overrides on /joining-information page", async () => {
    const services = createMockServices();
    await services.content.updateSection(
      "recruitment",
      recruitmentContentSchema.parse({
        ...recruitmentJson,
        isOpen: false,
      }),
    );

    // Default closed when isOpen=false
    const { unmount } = render(
      <AppDataProvider services={services}>
        <JoiningInformationPage />
      </AppDataProvider>,
    );
    expect(
      await screen.findByRole("heading", { level: 1, name: /Applications are currently closed/i }),
    ).toBeInTheDocument();
    unmount();

    // ?preview=open overrides isOpen=false
    mockSearchParams = new URLSearchParams("preview=open");
    const { unmount: unmountOpen } = render(
      <AppDataProvider services={services}>
        <JoiningInformationPage />
      </AppDataProvider>,
    );
    expect(
      await screen.findByRole("heading", { level: 1, name: /Recruitment Application/i }),
    ).toBeInTheDocument();
    unmountOpen();

    // ?preview=closed overrides isOpen=true
    await services.content.updateSection(
      "recruitment",
      recruitmentContentSchema.parse({
        ...recruitmentJson,
        isOpen: true,
      }),
    );
    mockSearchParams = new URLSearchParams("preview=closed");
    render(
      <AppDataProvider services={services}>
        <JoiningInformationPage />
      </AppDataProvider>,
    );
    expect(
      await screen.findByRole("heading", { level: 1, name: /Applications are currently closed/i }),
    ).toBeInTheDocument();
  });
});
