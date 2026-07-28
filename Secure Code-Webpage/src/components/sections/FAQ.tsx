import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Reveal from "@/components/effects/Reveal";
import Eyebrow from "@/components/Eyebrow";

const faqs = [
  {
    q: "Which languages are supported?",
    a: "Python and JavaScript today. Python is scanned with Bandit and JavaScript with Semgrep. More languages are on the roadmap.",
  },
  {
    q: "How accurate are the results?",
    a: "Findings come directly from Bandit and Semgrep, established open-source security scanners, so accuracy matches those tools. Each result is mapped to a CWE and severity.",
  },
  {
    q: "Will the enhancer break my code?",
    a: "No. The enhancer applies deterministic, well-understood transformations for known-insecure patterns (e.g. parameterising queries, replacing weak hashes) and shows you a diff before you accept anything.",
  },
  {
    q: "Is my code stored?",
    a: "Scans and enhancements are saved to your account so you can review them in your dashboard. You need to be signed in to use the scanner and enhancer.",
  },
  {
    q: "Is FortiScan free?",
    a: "Yes, it's a free, open-source project. You can self-host the backend or use the hosted instance.",
  },
];

export default function FAQ() {
  return (
    <section className="relative py-24">
      <div className="container mx-auto max-w-3xl px-4">
        <Reveal className="mb-12 text-center">
          <div className="mb-5 flex justify-center"><Eyebrow>FAQ</Eyebrow></div>
          <h2 className="font-display text-4xl font-medium tracking-[-0.03em] sm:text-5xl">
            Frequently asked <span className="text-gradient">questions</span>
          </h2>
        </Reveal>
        <Reveal direction="up">
          <Accordion type="single" collapsible className="glass rounded-2xl px-6">
            {faqs.map((f) => (
              <AccordionItem key={f.q} value={f.q} className="border-border/50">
                <AccordionTrigger className="text-left font-display text-base hover:no-underline hover:text-primary">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  );
}
