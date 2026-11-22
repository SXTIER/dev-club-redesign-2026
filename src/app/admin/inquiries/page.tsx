"use client";

import { AdminShell } from "@/components/admin/AdminShell";
import { InquiriesManager } from "@/components/admin/InquiriesManager";

export default function AdminInquiriesPage() {
  return (
    <AdminShell
      activeNav="inquiries"
      title="Inquiries & FAQ Tracker"
      subtitle="Never miss a question. Turn useful answers into your private FAQ bank."
    >
      <InquiriesManager />
    </AdminShell>
  );
}
