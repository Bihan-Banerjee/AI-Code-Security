import SecurityHeader from "@/components/SecurityHeader";
import HeroSection from "@/components/HeroSection";
import Features from "@/components/Features";
import CodeEditor from "@/components/CodeEditor";
import SecurityDashboard from "@/components/SecurityDashboard";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <SecurityHeader />
      <HeroSection />
      <Features />
      <CodeEditor />
      <SecurityDashboard />
    </div>
  );
};

export default Index;
