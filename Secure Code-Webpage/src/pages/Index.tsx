import Header from "@/components/layout/Header";
import Footer from "@/components/Footer";
import Hero from "@/components/sections/Hero";
import DisplayWord from "@/components/sections/DisplayWord";
import Features from "@/components/sections/Features";
import HowItWorks from "@/components/sections/HowItWorks";
import LiveDemo from "@/components/sections/LiveDemo";
import CoverageMarquee from "@/components/sections/CoverageMarquee";
import FAQ from "@/components/sections/FAQ";
import BigStatement from "@/components/sections/BigStatement";
import CTA from "@/components/sections/CTA";

const Index = () => {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background">
      {/* Subtle grid across the whole page background */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-grid opacity-60" />
      <div className="relative z-10">
      <Header />
      <main>
        <Hero />
        <DisplayWord />
        <CoverageMarquee />
        <Features />
        <HowItWorks />
        <LiveDemo />
        <FAQ />
        <BigStatement />
        <CTA />
      </main>
      <Footer />
      </div>
    </div>
  );
};

export default Index;
