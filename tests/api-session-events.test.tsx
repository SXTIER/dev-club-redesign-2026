import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { AppDataProvider, useAppData } from "@/context/AppDataContext";
import { createMockServices } from "@/lib/services/mockAdapter";
import { clearAllOverlays } from "@/lib/storage/localOverlay";
import eventsJson from "@/content/events.json";
import { eventsListSchema } from "@/lib/types/events";

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  clearAllOverlays();
});

it("loads private drafts after login and removes them after logout without reloading", async () => {
  const user = userEvent.setup();
  const services = createMockServices();
  const events = eventsListSchema.parse(eventsJson);
  let authenticated = false;
  vi.spyOn(services.events, "listEvents").mockImplementation(async () =>
    events.filter((event) => authenticated || event.status === "Published"),
  );
  vi.spyOn(services.auth, "getSession").mockResolvedValue(null);
  vi.spyOn(services.auth, "login").mockImplementation(async () => {
    authenticated = true;
    return { email: "admin@example.com", authenticated: true, loggedInAt: "2026-11-22T00:00:00Z" };
  });
  vi.spyOn(services.auth, "logout").mockImplementation(async () => {
    authenticated = false;
  });
  const draft = events.find((event) => event.status === "Draft")!;
  function Consumer() {
    const { events, services, isHydrated } = useAppData();
    return <div>
      <span>{isHydrated ? "Ready" : "Loading"}</span>
      {events.map((event) => <p key={event.id}>{event.title}</p>)}
      <button onClick={() => void services.auth.login({ email: "admin@example.com", password: "password123!", confirmPassword: "password123!" })}>Sign in</button>
      <button onClick={() => void services.auth.logout()}>Sign out</button>
    </div>;
  }
  render(<AppDataProvider services={services} mode="api"><Consumer /></AppDataProvider>);
  await screen.findByText("Ready");
  expect(screen.queryByText(draft.title)).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Sign in" }));
  expect(await screen.findByText(draft.title)).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Sign out" }));
  await waitFor(() => expect(screen.queryByText(draft.title)).not.toBeInTheDocument());
});
