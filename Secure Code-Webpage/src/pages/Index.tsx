import Header from "@/components/layout/Header";
import Footer from "@/components/Footer";
import Hero from "@/components/sections/Hero";
import Features from "@/components/sections/Features";
import HowItWorks from "@/components/sections/HowItWorks";
import LiveDemo from "@/components/sections/LiveDemo";
import CoverageMarquee from "@/components/sections/CoverageMarquee";
import FAQ from "@/components/sections/FAQ";
import CTA from "@/components/sections/CTA";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Hero />
        <CoverageMarquee />
        <Features />
        <HowItWorks />
        <LiveDemo />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
