import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Shield, Zap, Eye, TrendingUp } from "lucide-react";
import heroImage from "@/assets/hero-security.jpg";

const HeroSection = () => {
  return (
    <section className="relative overflow-hidden py-20 lg:py-28">
      <div className="container px-4 md:px-6">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 items-center">
          <div className="flex flex-col justify-center space-y-8">
            <div className="space-y-6">
              <div className="inline-block">
                <div className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold bg-accent text-accent-foreground">
                  <Shield className="h-3 w-3 mr-2" />
                  AI-Powered Security Enhancement
                </div>
              </div>
              
              <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                Secure Your Code with
                <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent"> AI Intelligence !</span>
              </h1>
              
              <p className="max-w-[600px] text-muted-foreground md:text-xl">
                Advanced AI model that analyzes, detects, and automatically fixes security vulnerabilities in your code. 
                Get real-time security scoring and comprehensive audit reports.
              </p>
            </div>
            <div className="flex flex-col gap-4 min-[400px]:flex-row">
              <Button variant="security" size="lg" className="text-base">
                <Zap className="h-5 w-5 mr-2" />
                Start Security Scan
              </Button>
              <Button variant="outline" size="lg" className="text-base">
                <Eye className="h-5 w-5 mr-2" />
                View Demo
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-6 pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">99.8%</div>
                <div className="text-sm text-muted-foreground">Accuracy Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">50+</div>
                <div className="text-sm text-muted-foreground">Vulnerability Types</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">100%</div>
                <div className="text-sm text-muted-foreground">Happy Users</div>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary-glow/20 rounded-3xl blur-3xl"></div>
            <Card className="relative overflow-hidden border-0 shadow-2xl">
              <img
                src={heroImage}
                alt="Security Dashboard"
                className="w-full h-auto rounded-lg"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent"></div>
              <div className="absolute bottom-4 left-4 right-4">
                <div className="flex items-center justify-between p-4 bg-background/90 backdrop-blur rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium">Scan Complete</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <TrendingUp className="h-4 w-4 text-success" />
                    <span className="text-sm font-bold text-success">Security Score: A+</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;