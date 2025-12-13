import SecurityHeader from "@/components/SecurityHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Shield, Quote, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import axios, { AxiosError } from "axios";
import Footer from "@/components/Footer";
import { toast } from "react-hot-toast";
import { useMutation } from "@tanstack/react-query";

interface ReviewFormData {
  name: string;
  email: string;
  rating: number;
  review: string;
}

const Reviews = () => {
  const [formData, setFormData] = useState<ReviewFormData>({
    name: "",
    email: "",
    rating: 0,
    review: "",
  });

  const reviews = [
    {
      id: 1,
      name: "Alex Thompson",
      role: "Senior Security Engineer",
      company: "TechCorp Solutions",
      rating: 5,
      review:
        "FortiScan has revolutionized our workflow. The AI-powered vulnerability detection caught issues our traditional scanners missed!",
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
        "As a growing startup, we needed enterprise-level security without the cost. FortiScan delivers exactly that!",
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
        "In the financial sector, security isn't optional. FortiScan helps us maintain compliance while enabling rapid development.",
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
        "Good tool but I'd love deeper integration for smart contract vulnerability detection.",
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
        "AI-powered secure coding is the future. FortiScan makes it real today!",
      avatar: "AH",
      date: "2024-04-18",
      verified: true,
      featured: false,
    },
  ];

  const [hoveredRating, setHoveredRating] = useState(0);

  const renderStars = (rating: number, interactive = false) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-6 w-6 cursor-pointer transition-all duration-200 ${
          i < (interactive ? (hoveredRating || rating) : rating)
            ? "text-yellow-400 fill-yellow-400 scale-110"
            : "text-gray-300"
        } ${interactive ? "hover:scale-125" : ""}`}
        onClick={() => interactive && setFormData({ ...formData, rating: i + 1 })}
        onMouseEnter={() => interactive && setHoveredRating(i + 1)}
        onMouseLeave={() => interactive && setHoveredRating(0)}
      />
    ));
  };

  const mutation = useMutation<any, AxiosError, ReviewFormData>({
    mutationFn: (newReview: ReviewFormData) => {
      return axios.post("/api/reviews", {
        ...newReview,
        date: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      toast.success("Review submitted successfully!");
      setFormData({ name: "", email: "", rating: 0, review: "" });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to submit review");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { name, email, rating, review } = formData;

    if (!name || !email || !rating || !review) {
      toast.error("All fields are required!");
      return;
    }

    mutation.mutate(formData);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <SecurityHeader />

      <main className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 mb-6 shadow-lg">
            <Quote className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-5xl font-bold mb-4">
            What Our{" "}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Users
            </span>{" "}
            Say
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Trusted by security professionals and developers worldwide. See how
            FortiScan is transforming application security across industries.
          </p>
        </div>

        {/* Reviews Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-16">
          {reviews.map((review) => (
            <Card
              key={review.id}
              className={`group relative border-2 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 ${
                review.featured
                  ? "bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200"
                  : "bg-white border-gray-200"
              }`}
            >
              {review.featured && (
                <div className="absolute -top-3 -right-3">
                  <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg font-semibold px-3 py-1">
                    ⭐ Featured
                  </Badge>
                </div>
              )}

              <CardHeader className="pb-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold text-lg shadow-md">
                    {review.avatar}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-800">
                        {review.name}
                      </h3>
                      {review.verified && (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600 font-medium">
                      {review.role}
                    </p>
                    <p className="text-xs text-gray-500">
                      {review.company}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-1">
                    {renderStars(review.rating)}
                  </div>
                  <span className="text-xs text-gray-500 font-medium">
                    {new Date(review.date).toLocaleDateString()}
                  </span>
                </div>
              </CardHeader>

              <CardContent>
                <blockquote className="text-sm text-gray-700 leading-relaxed italic">
                  "{review.review}"
                </blockquote>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Submit Review Form */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-8 border-2 border-blue-200 shadow-xl max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Share Your Experience
            </h2>
            <p className="text-gray-600">Help others by sharing your thoughts about FortiScan</p>
          </div>
                
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block mb-2 font-semibold text-gray-700">Name</label>
              <input
                type="text"
                className="w-full p-3 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-blue-300 hover:shadow-md transition-all duration-200"
                placeholder="Your name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
                
            <div>
              <label className="block mb-2 font-semibold text-gray-700">Email</label>
              <input
                type="email"
                className="w-full p-3 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-blue-300 hover:shadow-md transition-all duration-200"
                placeholder="your.email@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
                
            <div>
              <label className="block mb-2 font-semibold text-gray-700">Rating</label>
              <div className="flex gap-2">{renderStars(formData.rating, true)}</div>
            </div>
                
            <div>
              <label className="block mb-2 font-semibold text-gray-700">Your Review</label>
              <textarea
                className="w-full p-3 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-blue-300 hover:shadow-md transition-all duration-200 resize-none"
                rows={4}
                placeholder="Share your experience with FortiScan..."
                value={formData.review}
                onChange={(e) => setFormData({ ...formData, review: e.target.value })}
                required
              />
            </div>
                
            <Button
              type="submit"
              size="lg"
              disabled={mutation.isPending}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-6 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {mutation.isPending ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Submitting...
                </>
              ) : (
                "Submit Review"
              )}
            </Button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Reviews;
