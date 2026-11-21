import { AboutSection } from "@/components/home/AboutSection";
import { FaqSection } from "@/components/home/FaqSection";
import { HeroSection } from "@/components/home/HeroSection";
import { LocationSection } from "@/components/home/LocationSection";
import { TeamsSection } from "@/components/home/TeamsSection";
import { TimelineSection } from "@/components/home/TimelineSection";
import { WhyUsSection } from "@/components/home/WhyUsSection";
import { PublicFooter } from "@/components/public/PublicFooter";
import { PublicNavbar } from "@/components/public/PublicNavbar";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-surface text-ink">
      <PublicNavbar />
      <main id="main-content" className="flex-1">
        <HeroSection />
        <AboutSection />
        <WhyUsSection />
        <TeamsSection />
        <TimelineSection />
        <LocationSection />
        <FaqSection />
      </main>
      <PublicFooter />
    </div>
  );
}
