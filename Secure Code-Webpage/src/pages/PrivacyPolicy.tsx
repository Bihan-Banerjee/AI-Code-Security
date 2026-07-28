import { Shield, ChevronRight, Lock, Eye, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/layout/Header";
import Footer from "@/components/Footer";
import Reveal from "@/components/effects/Reveal";
import { useNavigate } from "react-router-dom";

const highlights = [
  { Icon: Lock, title: "Data protection", text: "Your information is securely stored and protected." },
  { Icon: Eye, title: "Transparency", text: "Clear information on how we use your data." },
  { Icon: Database, title: "Your control", text: "You decide what information you share with us." },
];

const sections = [
  {
    title: "Information we collect",
    body: "We only ask for personal information when we truly need it to provide a service to you. We collect it by fair and lawful means, with your knowledge and consent, and we let you know why we're collecting it and how it will be used.",
  },
  {
    title: "How we use your information",
    list: [
      "Provide, operate, and maintain our website",
      "Improve, personalize, and expand our website",
      "Understand and analyze how you use our website",
      "Develop new features and functionality",
      "Communicate with you, including for customer service and updates",
      "Find and prevent fraud",
    ],
  },
  {
    title: "Security",
    body: "The security of your personal information is important to us, but no method of transmission over the Internet or electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your information, we cannot guarantee its absolute security.",
  },
  {
    title: "Changes to this policy",
    body: "We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page. Changes are effective when posted.",
  },
];

const PrivacyPolicy = () => {
  const navigate = useNavigate();
  return (
    <div className="relative min-h-screen bg-background bg-grid">
      <div className="pointer-events-none absolute inset-0 bg-gradient-twilight" />
      <Header />

      <section className="relative px-4 py-20">
        <Reveal className="mx-auto max-w-4xl text-center">
          <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-primary shadow-glow">
            <Shield className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="font-display text-5xl font-medium sm:text-6xl">
            Privacy <span className="text-gradient">Policy</span>
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-xl text-muted-foreground">
            Your privacy matters. It is FortiScan's policy to respect your privacy regarding any information we
            may collect across our website.
          </p>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {highlights.map(({ Icon, title, text }, i) => (
              <Reveal key={title} delay={i * 0.1} direction="up">
                <div className="group h-full rounded-2xl border border-border/60 bg-card/40 p-6 transition-all duration-300 hover:-translate-y-2 hover:border-primary/50 hover:shadow-glow">
                  <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-gradient-primary shadow-glow transition-transform group-hover:scale-110">
                    <Icon className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <h3 className="mb-1 font-display text-lg font-medium">{title}</h3>
                  <p className="text-sm text-muted-foreground">{text}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <div className="mt-12 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 px-6 py-3 text-sm font-medium text-muted-foreground">
            <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
            Last updated: December 2025
          </div>
        </Reveal>
      </section>

      <section className="px-4 py-16">
        <Reveal className="mx-auto max-w-4xl">
          <div className="glass space-y-10 rounded-2xl p-8 md:p-12">
            {sections.map((s) => (
              <div key={s.title}>
                <h2 className="mb-4 font-display text-2xl font-medium sm:text-3xl text-gradient">{s.title}</h2>
                {s.body && <p className="text-lg leading-relaxed text-muted-foreground">{s.body}</p>}
                {s.list && (
                  <ul className="list-inside list-disc space-y-2 text-lg leading-relaxed text-muted-foreground">
                    {s.list.map((li) => <li key={li}>{li}</li>)}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      <section className="px-4 py-16">
        <Reveal direction="scale" className="mx-auto max-w-3xl">
          <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-twilight p-12 text-center">
            <div className="pointer-events-none absolute inset-0 bg-grid bg-grid-fade opacity-50" />
            <div className="relative">
              <h2 className="font-display text-3xl font-medium">Questions?</h2>
              <p className="mt-3 text-lg text-muted-foreground">If you have any questions about our Privacy Policy, reach out.</p>
              <Button size="lg" onClick={() => navigate("/about")}
                className="mt-6 bg-gradient-primary px-8 py-6 font-medium text-primary-foreground shadow-glow transition-transform hover:scale-105">
                Contact Us <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </Reveal>
      </section>

      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
