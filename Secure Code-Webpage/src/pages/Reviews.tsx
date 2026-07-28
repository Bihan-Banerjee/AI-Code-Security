import { useState } from "react";
import { AxiosError } from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Star, Quote, CheckCircle } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import Reveal from "@/components/effects/Reveal";
import api from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";

interface ReviewFormData { name: string; email: string; rating: number; review: string }

const reviews = [
  { id: 1, name: "Alex Thompson", role: "Senior Security Engineer", company: "TechCorp Solutions", rating: 5, review: "FortiScan has revolutionized our workflow. The AI-powered vulnerability detection caught issues our traditional scanners missed!", avatar: "AT", featured: true },
  { id: 2, name: "Maria Rodriguez", role: "DevSecOps Lead", company: "CyberShield Inc", rating: 5, review: "The integration with our CI/CD pipeline was seamless. We've reduced review time by 80% while improving security coverage.", avatar: "MR", featured: false },
  { id: 3, name: "David Chen", role: "Lead Developer", company: "StartupScale", rating: 4, review: "As a growing startup, we needed enterprise-level security without the cost. FortiScan delivers exactly that!", avatar: "DC", featured: false },
  { id: 4, name: "Sarah Williams", role: "CISO", company: "FinanceFirst Bank", rating: 5, review: "In the financial sector, security isn't optional. FortiScan helps us maintain compliance while enabling rapid development.", avatar: "SW", featured: true },
  { id: 5, name: "Michael Foster", role: "Security Analyst", company: "HealthTech Solutions", rating: 5, review: "The AI explanations for each vulnerability are detailed and clear. It's like having a senior security consultant 24/7!", avatar: "MF", featured: false },
  { id: 6, name: "Jennifer Liu", role: "Product Security Manager", company: "CloudNative Corp", rating: 4, review: "Great tool for continuous security monitoring. The dashboard provides visibility into our security posture easily.", avatar: "JL", featured: false },
  { id: 7, name: "Ravi Kumar", role: "DevOps Engineer", company: "InfoSec Labs", rating: 5, review: "The AI-enhancer fixed insecure code instantly. A must-have for developers who care about secure coding!", avatar: "RK", featured: true },
  { id: 8, name: "Emily Carter", role: "Blockchain Developer", company: "CryptoChain Labs", rating: 3, review: "Good tool but I'd love deeper integration for smart contract vulnerability detection.", avatar: "EC", featured: false },
  { id: 9, name: "Omar Ahmed", role: "Security Researcher", company: "DataSafe Org", rating: 4, review: "Great for catching OWASP Top 10 vulnerabilities quickly!", avatar: "OA", featured: false },
  { id: 10, name: "Sophia Miller", role: "Software Engineer", company: "MicroApps Inc", rating: 5, review: "Loved the automated enhancement suggestions. It makes production code much more secure, effortlessly.", avatar: "SM", featured: false },
];

export default function Reviews() {
  const [formData, setFormData] = useState<ReviewFormData>({ name: "", email: "", rating: 0, review: "" });
  const [hoveredRating, setHoveredRating] = useState(0);
  const queryClient = useQueryClient();

  const { data: communityReviews = [] } = useQuery<{ id: string; name: string; rating: number; review: string; date: string }[]>({
    queryKey: ["reviews"],
    queryFn: async () => {
      const { data } = await api.get("/api/reviews");
      return Array.isArray(data.reviews) ? data.reviews : [];
    },
  });

  const initials = (name: string) =>
    name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "U";

  const renderStars = (rating: number, interactive = false) =>
    Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-6 w-6 transition-all duration-200 ${
          i < (interactive ? hoveredRating || rating : rating) ? "fill-warning text-warning scale-110" : "text-muted-foreground/40"
        } ${interactive ? "cursor-pointer hover:scale-125" : ""}`}
        onClick={() => interactive && setFormData({ ...formData, rating: i + 1 })}
        onMouseEnter={() => interactive && setHoveredRating(i + 1)}
        onMouseLeave={() => interactive && setHoveredRating(0)}
      />
    ));

  const mutation = useMutation<unknown, AxiosError, ReviewFormData>({
    mutationFn: (newReview) => api.post("/api/reviews", { ...newReview, date: new Date().toISOString() }),
    onSuccess: () => {
      toast.success("Review submitted successfully!");
      setFormData({ name: "", email: "", rating: 0, review: "" });
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
    },
    onError: (error) => toast.error(getErrorMessage(error, "Failed to submit review")),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { name, email, rating, review } = formData;
    if (!name || !email || !rating || !review) return toast.error("All fields are required!");
    mutation.mutate(formData);
  };

  return (
    <div className="relative min-h-screen bg-background bg-grid">
      <div className="pointer-events-none absolute inset-0 bg-gradient-twilight" />
      <Header />
      <main className="relative mx-auto max-w-7xl px-4 py-16">
        <Reveal className="mb-16 text-center">
          <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-primary shadow-glow">
            <Quote className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="font-display text-4xl font-medium sm:text-5xl">
            What our <span className="text-gradient">users</span> say
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Trusted by security professionals and developers. See how FortiScan transforms application security.
          </p>
        </Reveal>

        <div className="mb-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {reviews.map((review, i) => (
            <Reveal key={review.id} delay={Math.min(i * 0.05, 0.4)} direction="up">
              <div className={`group relative h-full rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-2 hover:shadow-glow ${
                review.featured ? "border-primary/40 bg-gradient-twilight" : "border-border/60 bg-card/40 hover:border-primary/40"
              }`}>
                {review.featured && (
                  <span className="absolute -right-2 -top-2 rounded-full bg-gradient-primary px-3 py-1 text-xs font-medium text-primary-foreground shadow-glow">
                    ⭐ Featured
                  </span>
                )}
                <div className="mb-4 flex items-center gap-4">
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-gradient-primary font-medium text-primary-foreground">{review.avatar}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{review.name}</h3>
                      <CheckCircle className="h-4 w-4 text-success" />
                    </div>
                    <p className="text-sm text-muted-foreground">{review.role}</p>
                    <p className="text-xs text-muted-foreground/70">{review.company}</p>
                  </div>
                </div>
                <div className="mb-3 flex gap-1">{renderStars(review.rating)}</div>
                <blockquote className="text-sm italic leading-relaxed text-foreground/80">"{review.review}"</blockquote>
              </div>
            </Reveal>
          ))}
        </div>

        {communityReviews.length > 0 && (
          <div className="mb-16">
            <Reveal className="mb-8 text-center">
              <h2 className="font-display text-2xl font-medium">
                From our <span className="text-gradient">community</span>
              </h2>
            </Reveal>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {communityReviews.map((r, i) => (
                <Reveal key={r.id} delay={Math.min(i * 0.05, 0.4)} direction="up">
                  <div className="h-full rounded-2xl border border-border/60 bg-card/40 p-6 transition-all duration-300 hover:-translate-y-2 hover:border-primary/40 hover:shadow-glow">
                    <div className="mb-4 flex items-center gap-4">
                      <div className="grid h-12 w-12 place-items-center rounded-full bg-gradient-primary font-medium text-primary-foreground">
                        {initials(r.name)}
                      </div>
                      <div>
                        <h3 className="font-medium">{r.name}</h3>
                        <p className="text-xs text-muted-foreground/70">
                          {r.date ? new Date(r.date).toLocaleDateString() : "Verified user"}
                        </p>
                      </div>
                    </div>
                    <div className="mb-3 flex gap-1">{renderStars(r.rating)}</div>
                    <blockquote className="text-sm italic leading-relaxed text-foreground/80">"{r.review}"</blockquote>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        )}

        <Reveal direction="up">
          <div className="glass-strong mx-auto max-w-2xl rounded-2xl p-8">
            <div className="mb-8 text-center">
              <h2 className="font-display text-2xl font-medium text-gradient">Share your experience</h2>
              <p className="mt-1 text-muted-foreground">Help others by sharing your thoughts about FortiScan</p>
            </div>
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label className="mb-2 block font-medium text-foreground/80">Name</label>
                <input type="text" className="w-full rounded-xl border border-border/60 bg-card/60 p-3 text-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="Your name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div>
                <label className="mb-2 block font-medium text-foreground/80">Email</label>
                <input type="email" className="w-full rounded-xl border border-border/60 bg-card/60 p-3 text-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="your.email@example.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
              </div>
              <div>
                <label className="mb-2 block font-medium text-foreground/80">Rating</label>
                <div className="flex gap-2">{renderStars(formData.rating, true)}</div>
              </div>
              <div>
                <label className="mb-2 block font-medium text-foreground/80">Your Review</label>
                <textarea className="w-full resize-none rounded-xl border border-border/60 bg-card/60 p-3 text-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                  rows={4} placeholder="Share your experience with FortiScan..." value={formData.review} onChange={(e) => setFormData({ ...formData, review: e.target.value })} required />
              </div>
              <Button type="submit" size="lg" disabled={mutation.isPending}
                className="w-full bg-gradient-primary py-6 font-medium text-primary-foreground shadow-glow transition-shadow hover:shadow-glow-accent disabled:opacity-50">
                {mutation.isPending ? "Submitting..." : "Submit Review"}
              </Button>
            </form>
          </div>
        </Reveal>
      </main>
      <Footer />
    </div>
  );
}
