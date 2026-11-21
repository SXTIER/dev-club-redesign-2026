import { LegalDocumentView } from "@/components/legal/LegalDocumentView";
import { PublicFooter } from "@/components/public/PublicFooter";
import { PublicNavbar } from "@/components/public/PublicNavbar";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-surface text-ink">
      <PublicNavbar />
      <main id="main-content" className="flex-1">
        <LegalDocumentView documentKey="privacyPolicy" />
      </main>
      <PublicFooter />
    </div>
  );
}
