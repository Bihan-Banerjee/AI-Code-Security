import { FileText, ChevronRight, Scale, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/layout/Header";
import Footer from "@/components/Footer";
import Reveal from "@/components/effects/Reveal";
import { useNavigate } from "react-router-dom";

const highlights = [
  { Icon: Scale, title: "Legal agreement", text: "Binding terms between you and the project." },
  { Icon: Shield, title: "Your rights", text: "Understanding your obligations and protections." },
  { Icon: FileText, title: "Service use", text: "Guidelines for using the platform safely." },
];

const sections = [
  {
    title: "Interpretation and definitions",
    body: "Words with an initial capital letter have meanings defined under the following conditions. These definitions have the same meaning whether they appear in singular or plural.",
  },
  {
    title: "Acknowledgment",
    body: "These are the Terms and Conditions governing the use of this Service and the agreement that operates between you and the project. They set out the rights and obligations of all users regarding the use of the Service.",
  },
  {
    title: "Limitation of liability",
    body: "To the maximum extent permitted by law, in no event shall the project or its suppliers be liable for any special, incidental, indirect, or consequential damages whatsoever arising out of or related to the use of or inability to use the Service.",
  },
  {
    title: '"As is" and "as available" disclaimer',
    body: 'The Service is provided "AS IS" and "AS AVAILABLE" with all faults and without warranty of any kind. To the maximum extent permitted by law, the project disclaims all warranties, whether express, implied, or statutory, including merchantability, fitness for a particular purpose, and non-infringement.',
  },
];

const TermsAndConditions = () => {
  const navigate = useNavigate();
  return (
    <div className="relative min-h-screen bg-background bg-grid">
      <div className="pointer-events-none absolute inset-0 bg-gradient-twilight" />
      <Header />

      <section className="relative px-4 py-20">
        <Reveal className="mx-auto max-w-4xl text-center">
          <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-primary shadow-glow">
            <FileText className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="font-display text-5xl font-medium sm:text-6xl">
            Terms &amp; <span className="text-gradient">Conditions</span>
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-xl text-muted-foreground">
            Please read these terms and conditions carefully before using our service.
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
                <p className="text-lg leading-relaxed text-muted-foreground">{s.body}</p>
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
              <p className="mt-3 text-lg text-muted-foreground">If you have any questions about these terms, reach out.</p>
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

export default TermsAndConditions;
