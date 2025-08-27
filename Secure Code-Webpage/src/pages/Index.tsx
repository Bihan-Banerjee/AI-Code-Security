import SecurityHeader from "@/components/SecurityHeader";
import HeroSection from "@/components/HeroSection";
import Features from "@/components/Features";
import CodeEditor from "@/components/CodeEditor";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <SecurityHeader />
      <HeroSection />
      <Features />
      <CodeEditor />
    </div>
  );
};

export default Index;
