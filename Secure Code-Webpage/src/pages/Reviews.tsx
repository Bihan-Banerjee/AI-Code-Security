import SecurityHeader from "@/components/SecurityHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Shield, Lock, Users, Award, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";

const Reviews = () => {
  const reviews = [
    {
      id: 1,
      name: "Alex Thompson",
      role: "Senior Security Engineer",
      company: "TechCorp Solutions",
      rating: 5,
      review:
        "SecureCode AI has revolutionized our security workflow. The AI-powered vulnerability detection caught issues our traditional scanners missed. The false positive rate is incredibly low.",
      avatar: "AT",
      date: "2024-01-15",
      verified: true,
      featured: true,
    },
    {
      id: 2,
      name: "Maria Rodriguez",
      role: "DevSecOps Lead",
      company: "CyberShield Inc",
      rating: 5,
      review:
        "The integration with our CI/CD pipeline was seamless. We've reduced security review time by 80% while improving coverage. The detailed reports help our team learn and improve.",
      avatar: "MR",
      date: "2024-01-20",
      verified: true,
      featured: false,
    },
    {
      id: 3,
      name: "David Chen",
      role: "Lead Developer",
      company: "StartupScale",
      rating: 4,
      review:
        "As a growing startup, we needed enterprise-level security without the enterprise cost. SecureCode AI delivers exactly that. The learning curve was minimal.",
      avatar: "DC",
      date: "2024-02-01",
      verified: true,
      featured: false,
    },
    {
      id: 4,
      name: "Sarah Williams",
      role: "CISO",
      company: "FinanceFirst Bank",
      rating: 5,
      review:
        "In the financial sector, security isn't optional. SecureCode AI helps us maintain compliance while enabling rapid development. The audit trail features are exceptional.",
      avatar: "SW",
      date: "2024-02-08",
      verified: true,
      featured: true,
    },
    {
      id: 5,
      name: "Michael Foster",
      role: "Security Analyst",
      company: "HealthTech Solutions",
      rating: 5,
      review:
        "The AI explanations for each vulnerability are incredibly detailed. It's like having a senior security consultant available 24/7. Our junior developers learn so much.",
      avatar: "MF",
      date: "2024-02-12",
      verified: true,
      featured: false,
    },
    {
      id: 6,
      name: "Jennifer Liu",
      role: "Product Security Manager",
      company: "CloudNative Corp",
      rating: 4,
      review:
        "Great tool for continuous security monitoring. The dashboard provides clear visibility into our security posture across multiple projects and environments.",
      avatar: "JL",
      date: "2024-02-18",
      verified: true,
      featured: false,
    },
  ];

  const stats = [
    { icon: Users, label: "Active Users", value: "50K+" },
    { icon: Shield, label: "Vulnerabilities Found", value: "2M+" },
    { icon: Award, label: "Enterprise Clients", value: "500+" },
    { icon: Lock, label: "Security Issues Prevented", value: "10K+" },
  ];

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < rating ? "text-warning fill-warning" : "text-muted-foreground"
        }`}
      />
    ));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Security Header */}
      <SecurityHeader />

      <main className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-primary shadow-glow">
              <Quote className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-4">
            What Our{" "}
            <span className="bg-gradient-primary bg-clip-text text-transparent drop-shadow-lg text-black/80">
              Users
            </span>{" "}
            Say
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Trusted by security professionals and developers worldwide. See how
            SecureCode AI is transforming application security across
            industries.
          </p>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
          {stats.map((stat, index) => (
            <Card
              key={index}
              className="text-center border-0 shadow-security bg-gradient-to-br from-card to-accent/10"
            >
              <CardContent className="p-6">
                {/* ICON FIX */}
                <div className="flex items-center justify-center w-14 h-14 rounded-full bg-muted mb-4 mx-auto shadow-md">
                  <stat.icon className="h-7 w-7 text-primary" />
                </div>

                {/* VALUE */}
                <div className="text-2xl font-bold text-foreground mb-1">
                  {stat.value}
                </div>

                {/* LABEL */}
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Reviews Grid */}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 mb-16">
          {reviews.map((review) => (
            <Card
              key={review.id}
              className={`relative border-0 shadow-security transition-transform hover:scale-105 duration-300 ${
                review.featured
                  ? "bg-gradient-to-br from-primary/5 to-primary/10 ring-1 ring-primary/20"
                  : "bg-card"
              }`}
            >
              {review.featured && (
                <div className="absolute -top-2 -right-2">
                  <Badge
                    variant="default"
                    className="bg-gradient-primary text-white shadow-glow"
                  >
                    Featured
                  </Badge>
                </div>
              )}

              <CardHeader className="pb-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-security text-white font-semibold">
                    {review.avatar}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">
                        {review.name}
                      </h3>
                      {review.verified && (
                        <Shield className="h-4 w-4 text-success" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {review.role}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {review.company}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-3">
                  <div className="flex items-center gap-1">
                    {renderStars(review.rating)}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {new Date(review.date).toLocaleDateString()}
                  </span>
                </div>
              </CardHeader>

              <CardContent>
                <blockquote className="text-sm text-muted-foreground leading-relaxed">
                  "{review.review}"
                </blockquote>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA Section */}
        <div className="text-center bg-gradient-to-r from-primary/10 to-primary-glow/10 rounded-2xl p-12 border border-primary/20">
          <h2 className="text-3xl font-bold mb-4">
            Join Thousands of{" "}
            <span className="bg-gradient-primary bg-clip-text text-transparent drop-shadow-lg text-black/80">
              Satisfied Users
            </span>
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Start securing your applications today with AI-powered vulnerability
            detection and automated security enhancement.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="default" size="lg">
              Start Free Trial
            </Button>
            <Button variant="outline" size="lg">
              Schedule Demo
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Reviews;
