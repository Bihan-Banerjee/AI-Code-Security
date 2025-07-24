import { Shield, Code, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

const SecurityHeader = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div className="flex items-center space-x-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-r from-primary to-primary-glow">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-xl">SecureCode AI</span>
        </div>
        
        <nav className="flex items-center space-x-6 ml-8">
          <a href="scanner" className="text-sm font-medium transition-colors hover:text-primary">
            Scanner
          </a>
          <a href="scanner" className="text-sm font-medium transition-colors hover:text-primary">
            Analyzer
          </a>
          <a href="#dashboard" className="text-sm font-medium transition-colors hover:text-primary">
            Dashboard
          </a>
          <a href="#reports" className="text-sm font-medium transition-colors hover:text-primary">
            Reports
          </a>
        </nav>

        <div className="ml-auto flex items-center space-x-4">
          <Button variant="outline" size="sm">
            <Code className="h-4 w-4 mr-2" />
            API
          </Button>
          <Button variant="security" size="sm">
            <Lock className="h-4 w-4 mr-2" />
            Secure Scan
          </Button>
        </div>
      </div>
    </header>
  );
};

export default SecurityHeader;