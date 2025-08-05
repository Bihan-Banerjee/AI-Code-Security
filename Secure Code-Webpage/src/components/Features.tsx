import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Zap, BarChart3, Brain, Lock, Eye, Cpu, Cloud } from "lucide-react";

const Features = () => {
  const features = [
    {
      icon: <Brain className="h-8 w-8" />,
      title: "AI-Powered Analysis",
      description: "Advanced machine learning models trained on millions of code samples to identify complex security patterns and vulnerabilities."
    },
    {
      icon: <Zap className="h-8 w-8" />,
      title: "Real-time Scanning",
      description: "Instant security analysis as you code with live feedback and immediate vulnerability detection."
    },
    {
      icon: <Shield className="h-8 w-8" />,
      title: "Auto-Fix Generation",
      description: "Automatically generate secure code fixes with detailed explanations of what was changed and why."
    },
    {
      icon: <BarChart3 className="h-8 w-8" />,
      title: "Security Scoring",
      description: "Comprehensive security scoring system that tracks your code's security posture over time."
    },
    {
      icon: <Lock className="h-8 w-8" />,
      title: "50+ Vulnerability Types",
      description: "Detect SQL injection, XSS, CSRF, buffer overflows, authentication issues, and many more security flaws."
    },
    {
      icon: <Eye className="h-8 w-8" />,
      title: "Code Highlighting",
      description: "Visual highlighting of vulnerable code sections with detailed explanations and fix suggestions."
    },
    {
      icon: <Cpu className="h-8 w-8" />,
      title: "Multi-Language Support",
      description: "Support for Python, JavaScript, Java, C/C++, Go, Rust, and 20+ other programming languages."
    },
    {
      icon: <Cloud className="h-8 w-8" />,
      title: "CI/CD Integration",
      description: "Seamlessly integrate with your existing development workflow through GitHub Actions, Jenkins, and more."
    }
  ];

  return (
    <section className="py-16 px-4">
      <div className="container mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Powerful Security Features</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Our AI-driven security platform provides comprehensive code analysis and automated vulnerability fixing
            to keep your applications secure.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <Card key={index} className="relative group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-gradient-to-r from-primary/10 to-primary-glow/10 text-primary group-hover:scale-110 transition-transform">
                    {feature.icon}
                  </div>
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-16 bg-gradient-to-r from-primary/5 to-primary-glow/5 rounded-2xl p-8 text-center">
          <h3 className="text-2xl font-bold mb-4">Trusted by Security Professionals</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-1">99.8%</div>
              <div className="text-sm text-muted-foreground">Detection Accuracy</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-1">&lt;100ms</div>
              <div className="text-sm text-muted-foreground">Average Scan Time</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-1">50M+</div>
              <div className="text-sm text-muted-foreground">Lines Analyzed</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-1">24/7</div>
              <div className="text-sm text-muted-foreground">Monitoring</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;