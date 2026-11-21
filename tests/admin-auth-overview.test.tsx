import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import adminSeedJson from "@/content/admin-seed.json";
import eventsJson from "@/content/events.json";
import AdminIndexPage from "@/app/admin/page";
import { AdminLoginView } from "@/components/admin/AdminLoginView";
import { AdminShell } from "@/components/admin/AdminShell";
import { OverviewDashboard } from "@/components/admin/OverviewDashboard";
import { AppDataProvider } from "@/context/AppDataContext";
import { createMockServices } from "@/lib/services/mockAdapter";
import { clearAllFiles } from "@/lib/storage/indexedDbFiles";
import { clearAllOverlays } from "@/lib/storage/localOverlay";

const mockPush = vi.fn();
const mockReplace = vi.fn();
let mockPathname = "/admin/overview";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  usePathname: () => mockPathname,
}));

describe("Admin Login, AdminShell (AuthGuard), and Overview Dashboard", () => {
  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    clearAllOverlays();
    await clearAllFiles();
    mockPush.mockReset();
    mockReplace.mockReset();
    mockPathname = "/admin/overview";
  });

  describe("AdminLoginView", () => {
    it("shows inline red error when password and confirm password mismatch, toggles eye visibility, and cycles meme slides", async () => {
      const user = userEvent.setup();
      render(
        <AppDataProvider>
          <AdminLoginView />
        </AppDataProvider>,
      );

      expect(screen.getByText(/<Admin SignIn \/> !/i)).toBeInTheDocument();
      const homeLink = screen.getByRole("link", { name: /Back to Home/i });
      expect(homeLink).toHaveAttribute("href", "/");

      const emailInput = screen.getByPlaceholderText(/Enter your email/i);
      const passwordInput = screen.getByPlaceholderText(/Enter your password/i);
      const confirmInput = screen.getByPlaceholderText(/Confirm your password/i);

      expect(passwordInput).toHaveAttribute("type", "password");
      expect(confirmInput).toHaveAttribute("type", "password");

      await user.click(screen.getByRole("button", { name: /show password/i }));
      expect(passwordInput).toHaveAttribute("type", "text");
      await user.click(screen.getByRole("button", { name: /hide password/i }));
      expect(passwordInput).toHaveAttribute("type", "password");

      await user.click(
        screen.getByRole("button", { name: /show confirm password/i }),
      );
      expect(confirmInput).toHaveAttribute("type", "text");

      await user.type(emailInput, "admin@muictdev.club");
      await user.type(passwordInput, "secret123");
      await user.type(confirmInput, "different");
      await user.click(screen.getByRole("button", { name: /Submit/i }));

      expect(screen.getByRole("alert")).toHaveTextContent(/do not match/i);

      // Meme carousel cycling
      const totalMemes = adminSeedJson.signinMemes.length;
      expect(screen.getByTestId("meme-counter")).toHaveTextContent(
        `1 / ${totalMemes}`,
      );
      expect(
        screen.getByText(adminSeedJson.signinMemes[0].caption!),
      ).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /next meme/i }));
      expect(screen.getByTestId("meme-counter")).toHaveTextContent(
        `2 / ${totalMemes}`,
      );
      expect(
        screen.getByText(adminSeedJson.signinMemes[1].caption!),
      ).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /previous meme/i }));
      expect(screen.getByTestId("meme-counter")).toHaveTextContent(
        `1 / ${totalMemes}`,
      );

      await user.click(screen.getByRole("button", { name: /previous meme/i }));
      expect(screen.getByTestId("meme-counter")).toHaveTextContent(
        `${totalMemes} / ${totalMemes}`,
      );
    });

    it("calls services.auth.login and redirects to /admin/overview on valid submit", async () => {
      const user = userEvent.setup();
      const services = createMockServices();
      const loginSpy = vi.spyOn(services.auth, "login");

      render(
        <AppDataProvider services={services} mode="mock">
          <AdminLoginView />
        </AppDataProvider>,
      );

      await user.type(
        screen.getByPlaceholderText(/Enter your email/i),
        "admin@muictdev.club",
      );
      await user.type(
        screen.getByPlaceholderText(/Enter your password/i),
        "secret123",
      );
      await user.type(
        screen.getByPlaceholderText(/Confirm your password/i),
        "secret123",
      );
      await user.click(screen.getByRole("button", { name: /Submit/i }));

      await waitFor(() =>
        expect(loginSpy).toHaveBeenCalledWith({
          email: "admin@muictdev.club",
          password: "secret123",
          confirmPassword: "secret123",
        }),
      );

      await waitFor(() =>
        expect(mockReplace).toHaveBeenCalledWith("/admin/overview"),
      );
    });
  });

  describe("AdminShell (AdminAuthGuard)", () => {
    it("redirects unauthenticated users to /admin/login without flashing protected content", async () => {
      const services = createMockServices();
      render(
        <AppDataProvider services={services} mode="mock">
          <AdminShell activeNav="overview">
            <div>Secret Admin Panel</div>
          </AdminShell>
        </AppDataProvider>,
      );

      await waitFor(() =>
        expect(mockReplace).toHaveBeenCalledWith("/admin/login"),
      );
      expect(screen.queryByText("Secret Admin Panel")).not.toBeInTheDocument();
    });

    it("renders Topbar navigation, Preview / Mock Mode pill, session email, and handles Log out + mobile drawer", async () => {
      const user = userEvent.setup();
      const services = createMockServices();
      await services.auth.login({
        email: "president@muictdev.club",
        password: "password123",
        confirmPassword: "password123",
      });
      const logoutSpy = vi.spyOn(services.auth, "logout");

      render(
        <AppDataProvider services={services} mode="mock">
          <AdminShell activeNav="overview" title="Admin Title" subtitle="Sub">
            <div>Protected Dashboard Body</div>
          </AdminShell>
        </AppDataProvider>,
      );

      expect(
        await screen.findByText("Protected Dashboard Body"),
      ).toBeInTheDocument();

      // Topbar links & state
      const nav = screen.getByRole("navigation", { name: /admin navigation/i });
      expect(within(nav).getByRole("link", { name: /Overview/i })).toHaveAttribute(
        "href",
        "/admin/overview",
      );
      expect(within(nav).getByRole("link", { name: /Overview/i })).toHaveAttribute(
        "aria-current",
        "page",
      );
      expect(
        within(nav).getByRole("link", { name: /Site content/i }),
      ).toHaveAttribute("href", "/admin/site-content");
      expect(within(nav).getByRole("link", { name: /Events/i })).toHaveAttribute(
        "href",
        "/admin/events",
      );
      expect(
        within(nav).getByRole("link", { name: /Recruitment/i }),
      ).toHaveAttribute("href", "/admin/recruitment");
      expect(
        within(nav).getByRole("link", { name: /Inquiries/i }),
      ).toHaveAttribute("href", "/admin/inquiries");

      expect(screen.getByText(/Preview \/ Mock Mode/i)).toBeInTheDocument();
      expect(screen.getByText("president@muictdev.club")).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /View Home/i }),
      ).toHaveAttribute("href", "/");

      // Mobile drawer open + Escape close
      await user.click(
        screen.getByRole("button", { name: /toggle admin navigation/i }),
      );
      expect(
        screen.getByRole("dialog", { name: /admin navigation drawer/i }),
      ).toBeInTheDocument();
      await user.keyboard("{Escape}");
      expect(
        screen.queryByRole("dialog", { name: /admin navigation drawer/i }),
      ).not.toBeInTheDocument();

      // Log out
      await user.click(screen.getByRole("button", { name: /Log out/i }));
      await waitFor(() => expect(logoutSpy).toHaveBeenCalledTimes(1));
      await waitFor(() =>
        expect(mockReplace).toHaveBeenCalledWith("/admin/login"),
      );
    });
  });

  describe("OverviewDashboard", () => {
    it("renders live KPI counts from AppDataContext, Preview/Mock Mode indicator, Latest Recruitment, and Latest Questions", async () => {
      render(
        <AppDataProvider mode="mock">
          <OverviewDashboard />
        </AppDataProvider>,
      );

      await waitFor(() =>
        expect(
          screen.getByRole("heading", { name: /Club Overview & Statistics/i }),
        ).toBeInTheDocument(),
      );

      expect(screen.getByText(/Preview \/ Mock Mode/i)).toBeInTheDocument();
      expect(screen.getByText(/Recruitment Status:/i)).toBeInTheDocument();

      // Live KPI assertions against seeded data
      const expectedPendingApps = adminSeedJson.applications.filter(
        (app) => app.status === "Pending",
      ).length;
      const expectedTotalApps = adminSeedJson.applications.length;
      const expectedPublishedEvents = eventsJson.filter(
        (evt) => evt.status === "Published",
      ).length;
      const expectedTotalEvents = eventsJson.length;
      const expectedUnreadInquiries = adminSeedJson.inquiries.filter(
        (inq) => inq.status === "Unanswered",
      ).length;
      const expectedTotalInquiries = adminSeedJson.inquiries.length;

      const recruitmentCard = screen.getByTestId("kpi-recruitment");
      expect(
        within(recruitmentCard).getByText(String(expectedPendingApps)),
      ).toBeInTheDocument();
      expect(
        within(recruitmentCard).getByText(
          new RegExp(`${expectedTotalApps}\\s+total submitted`, "i"),
        ),
      ).toBeInTheDocument();

      const eventsCard = screen.getByTestId("kpi-events");
      expect(
        within(eventsCard).getByText(String(expectedPublishedEvents)),
      ).toBeInTheDocument();
      expect(
        within(eventsCard).getByText(
          new RegExp(`${expectedTotalEvents}\\s+total events`, "i"),
        ),
      ).toBeInTheDocument();

      const inquiriesCard = screen.getByTestId("kpi-inquiries");
      expect(
        within(inquiriesCard).getByText(String(expectedUnreadInquiries)),
      ).toBeInTheDocument();
      expect(
        within(inquiriesCard).getByText(
          new RegExp(`${expectedTotalInquiries}\\s+total inquiries`, "i"),
        ),
      ).toBeInTheDocument();

      // Latest sections
      const latestRecruitment = screen.getByTestId("latest-recruitment");
      expect(
        within(latestRecruitment).getByText(/Latest Recruitment/i),
      ).toBeInTheDocument();
      expect(
        within(latestRecruitment).getByText(/Somchai Narin/i),
      ).toBeInTheDocument();
      expect(
        within(latestRecruitment).getByRole("link", { name: /View all/i }),
      ).toHaveAttribute("href", "/admin/recruitment");

      const latestQuestions = screen.getByTestId("latest-questions");
      expect(
        within(latestQuestions).getByText(/Latest Questions/i),
      ).toBeInTheDocument();
      expect(
        within(latestQuestions).getByText(
          /What is this club and what kind of activities do you run\?/i,
        ),
      ).toBeInTheDocument();
      expect(
        within(latestQuestions).getByRole("link", { name: /View all/i }),
      ).toHaveAttribute("href", "/admin/inquiries");
    });
  });

  describe("/admin index redirect", () => {
    it("redirects unauthenticated users to /admin/login and authenticated users to /admin/overview", async () => {
      const services = createMockServices();
      const { unmount } = render(
        <AppDataProvider services={services} mode="mock">
          <AdminIndexPage />
        </AppDataProvider>,
      );

      await waitFor(() =>
        expect(mockReplace).toHaveBeenCalledWith("/admin/login"),
      );
      unmount();

      mockReplace.mockReset();
      await services.auth.login({
        email: "admin@muictdev.club",
        password: "password123",
        confirmPassword: "password123",
      });

      render(
        <AppDataProvider services={services} mode="mock">
          <AdminIndexPage />
        </AppDataProvider>,
      );

      await waitFor(() =>
        expect(mockReplace).toHaveBeenCalledWith("/admin/overview"),
      );
    });
  });
});
