import SecurityHeader from "@/components/SecurityHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Shield, Lock, Users, Award, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import axios from "axios";
import Footer from "@/components/Footer";
import { toast } from "react-hot-toast";

const Reviews = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    rating: 0,
    review: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const stats = [
    { icon: Users, label: "Active Users", value: "50K+" },
    { icon: Shield, label: "Vulnerabilities Found", value: "2M+" },
    { icon: Award, label: "Enterprise Clients", value: "500+" },
    { icon: Lock, label: "Security Issues Prevented", value: "10K+" },
  ];

  const reviews = [
    {
      id: 1,
      name: "Alex Thompson",
      role: "Senior Security Engineer",
      company: "TechCorp Solutions",
      rating: 5,
      review:
        "SecureCode AI has revolutionized our workflow. The AI-powered vulnerability detection caught issues our traditional scanners missed!",
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
        "The integration with our CI/CD pipeline was seamless. We've reduced review time by 80% while improving security coverage.",
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
        "As a growing startup, we needed enterprise-level security without the cost. SecureCode AI delivers exactly that!",
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
        "In the financial sector, security isn't optional. SecureCode AI helps us maintain compliance while enabling rapid development.",
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
        "The AI explanations for each vulnerability are detailed and clear. It's like having a senior security consultant 24/7!",
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
        "Great tool for continuous security monitoring. The dashboard provides visibility into our security posture easily.",
      avatar: "JL",
      date: "2024-02-18",
      verified: true,
      featured: false,
    },
    {
      id: 7,
      name: "Ravi Kumar",
      role: "DevOps Engineer",
      company: "InfoSec Labs",
      rating: 5,
      review:
        "The AI-enhancer fixed insecure code instantly. A must-have for developers who care about secure coding!",
      avatar: "RK",
      date: "2024-03-02",
      verified: true,
      featured: true,
    },
    {
      id: 8,
      name: "Emily Carter",
      role: "Blockchain Developer",
      company: "CryptoChain Labs",
      rating: 3,
      review:
        "Good tool but I’d love deeper integration for smart contract vulnerability detection.",
      avatar: "EC",
      date: "2024-03-05",
      verified: true,
      featured: false,
    },
    {
      id: 9,
      name: "Omar Ahmed",
      role: "Security Researcher",
      company: "DataSafe Org",
      rating: 4,
      review: "Great for catching OWASP Top 10 vulnerabilities quickly!",
      avatar: "OA",
      date: "2024-03-10",
      verified: true,
      featured: false,
    },
    {
      id: 10,
      name: "Sophia Miller",
      role: "Software Engineer",
      company: "MicroApps Inc",
      rating: 5,
      review:
        "Loved the automated enhancement suggestions — it makes production code much more secure effortlessly.",
      avatar: "SM",
      date: "2024-03-14",
      verified: true,
      featured: false,
    },
    {
      id: 11,
      name: "Lucas Brown",
      role: "Pen Tester",
      company: "WebSecure Dev",
      rating: 5,
      review:
        "Unmatched vulnerability detection accuracy. Worth every penny for any organization!",
      avatar: "LB",
      date: "2024-03-20",
      verified: true,
      featured: false,
    },
    {
      id: 12,
      name: "Hiro Tanaka",
      role: "Cybersecurity Consultant",
      company: "CyberLabs JP",
      rating: 4,
      review:
        "Documentation is excellent and onboarding was a breeze. Highly recommended!",
      avatar: "HT",
      date: "2024-03-25",
      verified: true,
      featured: false,
    },
    {
      id: 13,
      name: "Priya Patel",
      role: "AppSec Specialist",
      company: "AppGuard India",
      rating: 5,
      review:
        "Security compliance audits are much faster now. Saved us weeks per release cycle.",
      avatar: "PP",
      date: "2024-04-02",
      verified: true,
      featured: true,
    },
    {
      id: 14,
      name: "James Wilson",
      role: "Full Stack Developer",
      company: "NetDefend IO",
      rating: 4,
      review:
        "Smooth workflow, comprehensive vulnerability reports, and an intuitive dashboard.",
      avatar: "JW",
      date: "2024-04-10",
      verified: true,
      featured: false,
    },
    {
      id: 15,
      name: "Amira Hassan",
      role: "Product Manager",
      company: "CloudLock IO",
      rating: 5,
      review:
        "AI-powered secure coding is the future. SecureCode AI makes it real today!",
      avatar: "AH",
      date: "2024-04-18",
      verified: true,
      featured: false,
    },
  ];

  const renderStars = (rating: number, interactive = false) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-6 w-6 cursor-pointer transition-transform duration-200 ${
          i < rating
            ? "text-yellow-400 fill-yellow-400 scale-110"
            : "text-gray-400"
        } ${interactive ? "hover:scale-125" : ""}`}
        onClick={() => interactive && setFormData({ ...formData, rating: i + 1 })}
      />
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { name, email, rating, review } = formData;

    if (!name || !email || !rating || !review) {
      toast.error("All fields are required!");
      return;
    }

    setSubmitting(true);
    try {
      await axios.post("/api/reviews", {
        ...formData,
        date: new Date().toISOString(),
      });
      toast.success("Review submitted successfully!");
      setFormData({ name: "", email: "", rating: 0, review: "" });
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SecurityHeader />

      <main className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-primary shadow-glow">
              <Quote className="h-8 w-8 text-black" />
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-4">
            What Our{" "}
            <span className="bg-gradient-to-r from-blue-300 to-blue-400 bg-clip-text text-transparent">
              Users
            </span>{" "}
            Say
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Trusted by security professionals and developers worldwide. See how
            SecureCode AI is transforming application security across industries.
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
                <div className="flex items-center justify-center w-14 h-14 rounded-full bg-muted mb-4 mx-auto shadow-md">
                  <stat.icon className="h-7 w-7 text-primary" />
                </div>
                <div className="text-2xl font-bold text-foreground mb-1">
                  {stat.value}
                </div>
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

        {/* Submit Review Form */}
        <div className="bg-gradient-to-r from-primary/10 to-primary-glow/10 rounded-2xl p-8 border border-primary/20 shadow-md max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold mb-6 text-center">
            Share Your Experience
          </h2>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block mb-1 font-medium">Name</label>
              <input
                type="text"
                className="w-full p-3 rounded border focus:ring-2 focus:ring-primary"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block mb-1 font-medium">Email</label>
              <input
                type="email"
                className="w-full p-3 rounded border focus:ring-2 focus:ring-primary"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block mb-2 font-medium">Rating</label>
              <div className="flex gap-2">{renderStars(formData.rating, true)}</div>
            </div>

            <div>
              <label className="block mb-1 font-medium">Your Review</label>
              <textarea
                className="w-full p-3 rounded border focus:ring-2 focus:ring-primary"
                rows={4}
                value={formData.review}
                onChange={(e) => setFormData({ ...formData, review: e.target.value })}
                required
              />
            </div>

            <Button
              type="submit"
              variant="default"
              size="lg"
              disabled={submitting}
              className="w-full"
            >
              {submitting ? "Submitting..." : "Submit Review"}
            </Button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Reviews;
