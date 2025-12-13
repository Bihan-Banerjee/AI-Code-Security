import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Zap, BarChart3, Brain } from "lucide-react";

const Features = () => {
  const features = [
    {
      icon: Brain,
      title: "AI-Powered Analysis",
      description: "Advanced machine learning models trained on millions of code samples to identify complex security patterns and vulnerabilities.",
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      iconColor: "text-blue-600"
    },
    {
      icon: Zap,
      title: "Auto-Fix Generation",
      description: "Automatically generate secure code fixes with detailed explanations of what was changed and why.",
      color: "from-purple-500 to-purple-600",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200",
      iconColor: "text-purple-600"
    },
    {
      icon: BarChart3,
      title: "Security Scoring",
      description: "Comprehensive security scoring system that tracks your code's security posture over time.",
      color: "from-green-500 to-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      iconColor: "text-green-600"
    },
    {
      icon: Shield,
      title: "50+ Vulnerability Types",
      description: "Detect SQL injection, XSS, CSRF, buffer overflows, authentication issues, and many more security flaws.",
      color: "from-pink-500 to-pink-600",
      bgColor: "bg-pink-50",
      borderColor: "border-pink-200",
      iconColor: "text-pink-600"
    },
  ];

  return (
    <section className="py-20 bg-gradient-to-b from-white to-gray-50">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Powerful Security Features
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Our AI-driven security platform provides comprehensive code analysis and automated vulnerability fixing
            to keep your applications secure.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <Card 
                key={index} 
                className={`group hover:shadow-xl transition-all duration-300 border-2 ${feature.borderColor} hover:-translate-y-2 bg-white cursor-pointer`}
              >
                <CardHeader>
                  {/* Icon and Title on Same Line */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`flex-shrink-0 p-3 rounded-xl ${feature.bgColor} group-hover:scale-110 group-hover:rotate-6 transition-all duration-300`}>
                      <IconComponent className={`w-6 h-6 ${feature.iconColor}`} />
                    </div>
                    <CardTitle className="text-lg font-bold text-gray-800">
                      {feature.title}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-600 leading-relaxed text-sm">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Stats Section */}
        <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 shadow-2xl overflow-hidden">
          {/* Animated background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full filter blur-3xl animate-pulse"></div>
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-white rounded-full filter blur-3xl animate-pulse animation-delay-2000"></div>
          </div>
          
          <h3 className="relative text-3xl font-bold text-white text-center mb-8">
            Trusted by Security Professionals
          </h3>
          <div className="relative grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="group text-center hover:scale-110 transition-transform duration-300 cursor-pointer">
              <div className="text-5xl font-bold text-white mb-2 group-hover:animate-bounce">99.8%</div>
              <div className="text-blue-100 font-medium">Detection Accuracy</div>
            </div>
            <div className="group text-center hover:scale-110 transition-transform duration-300 cursor-pointer">
              <div className="text-5xl font-bold text-white mb-2 group-hover:animate-bounce">&lt;100ms</div>
              <div className="text-blue-100 font-medium">Average Scan Time</div>
            </div>
            <div className="group text-center hover:scale-110 transition-transform duration-300 cursor-pointer">
              <div className="text-5xl font-bold text-white mb-2 group-hover:animate-bounce">50M+</div>
              <div className="text-blue-100 font-medium">Lines Analyzed</div>
            </div>
            <div className="group text-center hover:scale-110 transition-transform duration-300 cursor-pointer">
              <div className="text-5xl font-bold text-white mb-2 group-hover:animate-bounce">24/7</div>
              <div className="text-blue-100 font-medium">Monitoring</div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .animation-delay-2000 {
          animation-delay: 2s;
        }
      `}</style>
    </section>
  );
};

export default Features;
