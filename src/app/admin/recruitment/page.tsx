"use client";

import { AdminShell } from "@/components/admin/AdminShell";
import { RecruitmentManager } from "@/components/admin/RecruitmentManager";

export default function AdminRecruitmentPage() {
  return (
    <AdminShell
      activeNav="recruitment"
      title="Recruitment Checklist"
      subtitle="Review student applications, CVs, and open/closed intake status."
    >
      <RecruitmentManager />
    </AdminShell>
  );
}
