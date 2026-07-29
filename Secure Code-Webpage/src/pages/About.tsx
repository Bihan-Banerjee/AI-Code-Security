import { Shield, Users, Award, ChevronRight, Star, Target, Rocket, Lock, Code, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Header from "@/components/layout/Header";
import Footer from "@/components/Footer";
import Reveal from "@/components/effects/Reveal";
import Parallax from "@/components/effects/Parallax";
import { useNavigate } from "react-router-dom";
import BihanPic from "../assets/Bihan.jpeg";
import NethraPic from "../assets/Nethra.jpeg";

const values = [
  { Icon: Shield, title: "Security first", text: "We prioritize security in every aspect of the platform, keeping your code and data protected." },
  { Icon: Users, title: "Developer-centric", text: "Built by developers, for developers, focusing on seamless integration into existing workflows." },
  { Icon: Award, title: "Innovation", text: "We constantly push the boundaries of what's possible with AI-assisted security analysis." },
];

const goals = [
  { Icon: Rocket, title: "Global expansion", text: "Bringing FortiScan to developers worldwide, setting a universal standard for secure coding." },
  { Icon: Star, title: "AI advancements", text: "Continuously evolving our analysis to detect even the most complex emerging vulnerabilities." },
  { Icon: Target, title: "Developer ecosystem", text: "Building a collaborative ecosystem of developers, contributors, and researchers." },
];

const team = [
  { name: "Bihan Banerjee", role: "Cybersecurity Specialist", bio: "4th year undergraduate specializing in CSE Information Security at VIT Vellore.", image: BihanPic },
  { name: "Nethra Krishnan", role: "AI Specialist", bio: "4th year undergraduate specializing in CSE Data Science at VIT Vellore.", image: NethraPic },
];

const floatIcons = [
  { Icon: Shield, pos: "left-6 top-6" },
  { Icon: Lock, pos: "right-6 top-6" },
  { Icon: Code, pos: "bottom-6 left-6" },
  { Icon: Eye, pos: "bottom-6 right-6" },
];

const About = () => {
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
            About <span className="text-gradient">FortiScan</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-xl text-muted-foreground">
            We're building accessible code security through AI-assisted tooling, helping developers ship safer
            applications with confidence.
          </p>
        </Reveal>
      </section>

      <section className="px-4 py-16">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
          <Reveal direction="right">
            <h2 className="font-display text-4xl font-medium">Our <span className="text-gradient">mission</span></h2>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
              Security shouldn't be an afterthought. Our mission is to democratize code security by making
              vulnerability detection accessible to every developer, regardless of security expertise.
            </p>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              Through established scanners and deterministic fixes, we're changing how vulnerabilities are
              discovered, explained, and resolved.
            </p>
          </Reveal>

          <Reveal direction="left" className="relative flex h-96 items-center justify-center">
            <div className="absolute h-80 w-80 rounded-full border border-primary/15 animate-spin-slow" />
            <div className="absolute h-64 w-64 rounded-full border border-accent/15 animate-glow-pulse" />
            <div className="relative rounded-2xl bg-gradient-primary p-8 shadow-glow">
              <Target className="h-20 w-20 text-primary-foreground" />
            </div>
            {floatIcons.map(({ Icon, pos }, i) => (
              <Parallax key={i} depth={18} className={`absolute ${pos}`}>
                <div className="animate-float rounded-xl border border-border/60 bg-card/70 p-4 shadow-glow-sm backdrop-blur" style={{ animationDelay: `${i * 0.5}s` }}>
                  <Icon className="h-7 w-7 text-primary" />
                </div>
              </Parallax>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="px-4 py-16">
        <Reveal className="mb-12 text-center">
          <h2 className="font-display text-4xl font-medium">Our <span className="text-gradient">values</span></h2>
          <p className="mt-3 text-xl text-muted-foreground">The principles that guide everything we do</p>
        </Reveal>
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
          {values.map(({ Icon, title, text }, i) => (
            <Reveal key={title} delay={i * 0.1} direction="up">
              <Card className="group h-full border-border/60 bg-card/40 transition-all duration-300 hover:-translate-y-2 hover:border-primary/50 hover:shadow-glow">
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-xl bg-gradient-primary shadow-glow transition-transform group-hover:scale-110">
                    <Icon className="h-8 w-8 text-primary-foreground" />
                  </div>
                  <CardTitle className="text-xl">{title}</CardTitle>
                </CardHeader>
                <CardContent><CardDescription className="text-center text-muted-foreground">{text}</CardDescription></CardContent>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="px-4 py-16">
        <Reveal className="mb-12 text-center">
          <h2 className="font-display text-4xl font-medium">Our <span className="text-gradient">team</span></h2>
          <p className="mt-3 text-xl text-muted-foreground">A security specialist and an AI researcher.</p>
        </Reveal>
        <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-2">
          {team.map((m, i) => (
            <Reveal key={m.name} delay={i * 0.12} direction="up">
              <Card className="group border-border/60 bg-card/40 text-center transition-all duration-300 hover:-translate-y-2 hover:border-primary/50 hover:shadow-glow">
                <CardHeader>
                  <div className="relative mx-auto mb-4 inline-block">
                    <div className="absolute inset-0 rounded-full bg-gradient-primary opacity-50 blur-lg transition-opacity group-hover:opacity-75" />
                    <img src={m.image} alt={m.name} className="relative h-24 w-24 rounded-full border-2 border-border object-cover" />
                  </div>
                  <CardTitle className="text-2xl">{m.name}</CardTitle>
                  <CardDescription className="text-lg font-medium text-gradient">{m.role}</CardDescription>
                </CardHeader>
                <CardContent><p className="text-muted-foreground">{m.bio}</p></CardContent>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="px-4 py-16">
        <Reveal className="mb-12 text-center">
          <h2 className="font-display text-4xl font-medium">Our future <span className="text-gradient">goals</span></h2>
          <p className="mt-3 text-xl text-muted-foreground">Building towards a safer, smarter coding ecosystem</p>
        </Reveal>
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
          {goals.map(({ Icon, title, text }, i) => (
            <Reveal key={title} delay={i * 0.1} direction="up">
              <Card className="group h-full border-border/60 bg-card/40 text-center transition-all duration-300 hover:-translate-y-2 hover:border-primary/50 hover:shadow-glow">
                <CardHeader>
                  <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-xl bg-gradient-primary shadow-glow transition-transform group-hover:scale-110 group-hover:rotate-6">
                    <Icon className="h-8 w-8 text-primary-foreground" />
                  </div>
                  <CardTitle className="text-xl">{title}</CardTitle>
                </CardHeader>
                <CardContent><p className="text-muted-foreground">{text}</p></CardContent>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="px-4 py-20">
        <Reveal direction="scale">
          <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-primary/30 bg-gradient-twilight p-12 text-center">
            <div className="pointer-events-none absolute inset-0 bg-grid bg-grid-fade opacity-50" />
            <div className="relative">
              <h2 className="font-display text-4xl font-medium">Join the FortiScan journey</h2>
              <p className="mx-auto mt-4 max-w-2xl text-xl text-muted-foreground">
                Be part of our mission to make secure coding accessible to all developers.
              </p>
              <Button size="lg" onClick={() => navigate("/dashboard")}
                className="mt-8 bg-gradient-primary px-8 py-6 font-medium text-primary-foreground shadow-glow transition-transform hover:scale-105">
                Get Started <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </Reveal>
      </section>

      <Footer />
    </div>
  );
};

export default About;
