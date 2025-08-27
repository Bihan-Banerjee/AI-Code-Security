import SecurityHeader from "@/components/SecurityHeader";
import HeroSection from "@/components/HeroSection";
import Features from "@/components/Features";
import CodeEditor from "@/components/CodeEditor";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <SecurityHeader />
      <HeroSection />
      <Features />
      <CodeEditor />
      <Footer />
    </div>
  );
};

export default Index;
