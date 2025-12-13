import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Zap, Eye, TrendingUp, Lock, Code, Scan, AlertTriangle, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";

const HeroSection = () => {
  // Dynamic security score state
  const [scoreData, setScoreData] = useState({
    grade: "A+",
    score: 98,
    status: "excellent",
    checks: [
      { icon: Lock, text: "SQL Injection Protected", type: "success" },
      { icon: Code, text: "XSS Vulnerabilities Fixed", type: "success" },
      { icon: Zap, text: "Code Quality Optimized", type: "success" }
    ]
  });

  // Generate random security scores
  useEffect(() => {
    const interval = setInterval(() => {
      const randomScore = Math.floor(Math.random() * 100);
      let grade, status, checks;

      if (randomScore >= 85) {
        // Excellent - Green
        grade = randomScore >= 95 ? "A+" : "A";
        status = "excellent";
        checks = [
          { icon: CheckCircle, text: "No Critical Vulnerabilities", type: "success" },
          { icon: Lock, text: "All Security Checks Passed", type: "success" },
          { icon: Shield, text: "Code Fully Optimized", type: "success" }
        ];
      } else if (randomScore >= 60) {
        // Medium - Yellow
        grade = randomScore >= 75 ? "B" : "C";
        status = "warning";
        checks = [
          { icon: AlertTriangle, text: "3 Medium Issues Found", type: "warning" },
          { icon: Code, text: "Input Validation Needed", type: "warning" },
          { icon: Lock, text: "Authentication Weakness", type: "warning" }
        ];
      } else {
        // Poor - Red
        grade = randomScore >= 40 ? "D" : "F";
        status = "critical";
        checks = [
          { icon: AlertTriangle, text: "Critical SQL Injection Found", type: "error" },
          { icon: Code, text: "XSS Vulnerabilities Detected", type: "error" },
          { icon: Lock, text: "Hardcoded Secrets Found", type: "error" }
        ];
      }

      setScoreData({ grade, score: randomScore, status, checks });
    }, 4000); // Change every 4 seconds

    return () => clearInterval(interval);
  }, []);

  // Get color classes based on status
  const getStatusColor = () => {
    switch (scoreData.status) {
      case "excellent":
        return {
          gradient: "from-green-600 to-emerald-600",
          bg: "bg-green-50",
          text: "text-green-600",
          border: "border-green-500"
        };
      case "warning":
        return {
          gradient: "from-yellow-600 to-orange-600",
          bg: "bg-yellow-50",
          text: "text-yellow-600",
          border: "border-yellow-500"
        };
      case "critical":
        return {
          gradient: "from-red-600 to-pink-600",
          bg: "bg-red-50",
          text: "text-red-600",
          border: "border-red-500"
        };
      default:
        return {
          gradient: "from-green-600 to-emerald-600",
          bg: "bg-green-50",
          text: "text-green-600",
          border: "border-green-500"
        };
    }
  };

  const statusColors = getStatusColor();

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative container mx-auto px-4 pt-20 pb-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8 z-10">
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-semibold animate-fade-in">
              <Shield className="w-4 h-4" />
              AI-Powered Security Enhancement
            </div>

            <div className="space-y-4">
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                Secure Your Code with{" "}
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  AI Intelligence
                </span>{" "}
                !
              </h1>
              
              <p className="text-xl text-gray-600 leading-relaxed">
                Advanced AI model that analyzes, detects, and automatically fixes security vulnerabilities in your code.
                Get real-time security scoring and comprehensive audit reports.
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <Link to="/scanner">
                <Button 
                  size="lg" 
                  className="group bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold px-8 py-6 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 relative overflow-hidden"
                >
                  {/* Shine effect on hover */}
                  <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 group-hover:animate-shine"></span>
                  <Scan className="w-5 h-5 mr-2 group-hover:animate-spin-once" />
                  Start Security Scan
                </Button>
              </Link>
              <Link to ="/demo">
                <Button 
                  size="lg" 
                  variant="outline"
                  className="group border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white font-semibold px-8 py-6 rounded-xl transition-all duration-300 hover:scale-105 active:scale-95 hover:shadow-lg relative overflow-hidden"
                >
                  <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-400 to-purple-400 opacity-0 group-hover:opacity-10 transition-opacity"></span>
                  <Eye className="w-5 h-5 mr-2 group-hover:animate-pulse" />
                  View Demo
                </Button>
              </Link>
            </div>

            {/* Stats with Hover Animation */}
            <div className="grid grid-cols-3 gap-6 pt-8">
              <div className="group text-center p-4 bg-white rounded-xl shadow-md border border-gray-100 hover:shadow-xl hover:-translate-y-2 transition-all duration-300 cursor-pointer hover:border-blue-300">
                <div className="text-3xl font-bold text-blue-600 group-hover:scale-110 transition-transform duration-300">99.8%</div>
                <div className="text-sm text-gray-600 font-medium">Accuracy Rate</div>
                <div className="h-1 w-0 bg-gradient-to-r from-blue-500 to-purple-500 group-hover:w-full transition-all duration-500 mt-2 rounded-full mx-auto"></div>
              </div>
              <div className="group text-center p-4 bg-white rounded-xl shadow-md border border-gray-100 hover:shadow-xl hover:-translate-y-2 transition-all duration-300 cursor-pointer hover:border-purple-300">
                <div className="text-3xl font-bold text-purple-600 group-hover:scale-110 transition-transform duration-300">50+</div>
                <div className="text-sm text-gray-600 font-medium">Vulnerability Types</div>
                <div className="h-1 w-0 bg-gradient-to-r from-purple-500 to-pink-500 group-hover:w-full transition-all duration-500 mt-2 rounded-full mx-auto"></div>
              </div>
              <div className="group text-center p-4 bg-white rounded-xl shadow-md border border-gray-100 hover:shadow-xl hover:-translate-y-2 transition-all duration-300 cursor-pointer hover:border-green-300">
                <div className="text-3xl font-bold text-green-600 group-hover:scale-110 transition-transform duration-300">100%</div>
                <div className="text-sm text-gray-600 font-medium">Happy Users</div>
                <div className="h-1 w-0 bg-gradient-to-r from-green-500 to-emerald-500 group-hover:w-full transition-all duration-500 mt-2 rounded-full mx-auto"></div>
              </div>
            </div>
          </div>

          {/* Right Side - Animated Security Graphic */}
          <div className="relative lg:h-[600px] flex items-center justify-center">
            {/* Animated Shield */}
            <div className="relative">
              {/* Outer Rotating Ring */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-96 h-96 rounded-full border-4 border-blue-200 animate-spin-slow"></div>
              </div>
              
              {/* Middle Pulse Ring */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-80 h-80 rounded-full border-2 border-purple-200 animate-pulse"></div>
              </div>

              {/* Center Shield Card - Dynamic */}
              <Card className={`relative w-72 bg-white/90 backdrop-blur-sm shadow-2xl border-2 ${statusColors.border} overflow-hidden transition-all duration-500`}>
                <div className={`absolute top-0 left-0 right-0 h-2 bg-gradient-to-r ${
                  scoreData.status === "excellent" 
                    ? "from-green-500 via-emerald-500 to-green-500"
                    : scoreData.status === "warning"
                    ? "from-yellow-500 via-orange-500 to-yellow-500"
                    : "from-red-500 via-pink-500 to-red-500"
                } animate-gradient`}></div>
                
                <CardContent className="p-8">
                  {/* Main Shield Icon */}
                  <div className="flex justify-center mb-6">
                    <div className="relative">
                      <div className={`absolute inset-0 bg-gradient-to-r ${statusColors.gradient} rounded-2xl blur-xl opacity-50 animate-pulse`}></div>
                      <div className={`relative bg-gradient-to-br ${statusColors.gradient} p-6 rounded-2xl transition-all duration-500`}>
                        <Shield className="w-16 h-16 text-white" />
                      </div>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="text-center space-y-4">
                    <div className="flex items-center justify-center gap-2">
                      <div className={`w-2 h-2 ${
                        scoreData.status === "excellent" 
                          ? "bg-green-500" 
                          : scoreData.status === "warning" 
                          ? "bg-yellow-500" 
                          : "bg-red-500"
                      } rounded-full animate-ping`}></div>
                      <div className={`w-2 h-2 ${
                        scoreData.status === "excellent" 
                          ? "bg-green-500" 
                          : scoreData.status === "warning" 
                          ? "bg-yellow-500" 
                          : "bg-red-500"
                      } rounded-full`}></div>
                      <span className={`text-sm font-semibold ${statusColors.text} transition-colors duration-500`}>
                        {scoreData.status === "excellent" 
                          ? "Scan Complete" 
                          : scoreData.status === "warning" 
                          ? "Issues Detected" 
                          : "Critical Issues"}
                      </span>
                    </div>
                    
                    <div>
                      <div className="text-sm text-gray-600 mb-2">Security Score</div>
                      <div className={`text-4xl font-bold bg-gradient-to-r ${statusColors.gradient} bg-clip-text text-transparent transition-all duration-500`}>
                        {scoreData.grade}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">({scoreData.score}/100)</div>
                    </div>

                    {/* Animated Security Checks - Dynamic */}
                    <div className="space-y-2 pt-4">
                      {scoreData.checks.map((item, idx) => (
                        <div 
                          key={idx}
                          className={`flex items-center gap-3 p-2 ${statusColors.bg} rounded-lg animate-slide-in transition-all duration-500`}
                          style={{ animationDelay: `${idx * 0.2}s` }}
                        >
                          <item.icon className={`w-4 h-4 ${statusColors.text} flex-shrink-0`} />
                          <span className="text-xs text-gray-700 font-medium">{item.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Floating Icons */}
              <div className="absolute -top-8 -left-8 bg-blue-100 p-3 rounded-xl shadow-lg animate-float hover:scale-110 transition-transform cursor-pointer">
                <Lock className="w-6 h-6 text-blue-600" />
              </div>
              <div className="absolute -top-8 -right-8 bg-purple-100 p-3 rounded-xl shadow-lg animate-float animation-delay-1000 hover:scale-110 transition-transform cursor-pointer">
                <Code className="w-6 h-6 text-purple-600" />
              </div>
              <div className="absolute -bottom-8 -left-8 bg-green-100 p-3 rounded-xl shadow-lg animate-float animation-delay-2000 hover:scale-110 transition-transform cursor-pointer">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div className="absolute -bottom-8 -right-8 bg-pink-100 p-3 rounded-xl shadow-lg animate-float animation-delay-3000 hover:scale-110 transition-transform cursor-pointer">
                <Zap className="w-6 h-6 text-pink-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Custom Animations */}
      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }

        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes spin-once {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes slide-in {
          from { 
            opacity: 0;
            transform: translateX(-20px);
          }
          to { 
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        @keyframes shine {
          0% { transform: translateX(-100%) skewX(-15deg); }
          100% { transform: translateX(200%) skewX(-15deg); }
        }

        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-blob { animation: blob 7s infinite; }
        .animate-float { animation: float 3s ease-in-out infinite; }
        .animate-spin-slow { animation: spin-slow 20s linear infinite; }
        .animate-spin-once { animation: spin-once 0.5s ease-in-out; }
        .animate-slide-in { animation: slide-in 0.5s ease-out forwards; }
        .animate-fade-in { animation: fade-in 0.8s ease-out; }
        .animate-gradient { 
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
        .animate-shine {
          animation: shine 1.5s ease-in-out;
        }
        .animation-delay-1000 { animation-delay: 1s; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-3000 { animation-delay: 3s; }
        .animation-delay-4000 { animation-delay: 4s; }

        /* Hover effect for buttons */
        @keyframes button-bounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
};

export default HeroSection;
