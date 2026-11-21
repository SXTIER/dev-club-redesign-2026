import { AdminShell } from "@/components/admin/AdminShell";
import { OverviewDashboard } from "@/components/admin/OverviewDashboard";

export default function AdminOverviewPage() {
  return (
    <AdminShell activeNav="overview">
      <OverviewDashboard />
    </AdminShell>
  );
}
