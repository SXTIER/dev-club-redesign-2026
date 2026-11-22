"use client";

import { AdminShell } from "@/components/admin/AdminShell";
import { EventsManager } from "@/components/admin/EventsManager";

export default function AdminEventsPage() {
  return (
    <AdminShell
      activeNav="events"
      title="Events & News Management"
      subtitle="Manage events, news announcements, and items displayed on Home / Event Roadmap."
    >
      <EventsManager />
    </AdminShell>
  );
}
