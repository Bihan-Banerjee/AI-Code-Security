import { ArrowLeft, Play, Pause, Volume2, VolumeX, Maximize, Shield, Zap, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useState, useRef } from "react";
import demoVideo from "@/assets/demovideo.mp4";
import Footer from "@/components/Footer";
import Header from "@/components/layout/Header";
import Reveal from "@/components/effects/Reveal";

const ViewDemo = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) videoRef.current.pause();
    else videoRef.current.play();
    setIsPlaying(!isPlaying);
  };
  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };
  const toggleFullscreen = () => videoRef.current?.requestFullscreen();

  const cards = [
    { Icon: Shield, title: "User friendly", text: "Get started in minutes with an intuitive interface and easy onboarding." },
    { Icon: Zap, title: "Powerful features", text: "Scan, enhance, and secure your code with AI-assisted precision." },
    { Icon: Rocket, title: "Launch fast", text: "Scan and enhance with one click and ship secure applications faster." },
  ];

  return (
    <div className="relative min-h-screen bg-background bg-grid">
      <div className="pointer-events-none absolute inset-0 bg-gradient-aurora" />
      <Header />
      <main className="relative mx-auto max-w-6xl space-y-6 px-6 py-10">
        <Link to="/">
          <Button variant="ghost" className="group font-semibold hover:text-primary">
            <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" /> Back to Home
          </Button>
        </Link>

        <Reveal className="space-y-3 text-center">
          <h1 className="font-display text-4xl font-bold sm:text-5xl">
            Watch our <span className="text-gradient">demo</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            See how the platform works in action — a quick walkthrough of the key features.
          </p>
        </Reveal>

        <Reveal direction="up">
          <div className="group relative overflow-hidden rounded-2xl border border-border/60 shadow-glow">
            <video ref={videoRef} className="aspect-video w-full bg-black" poster="/placeholder.svg" onEnded={() => setIsPlaying(false)}>
              <source src={demoVideo} type="video/mp4" />
            </video>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <button onClick={togglePlay} className="absolute inset-0 flex items-center justify-center">
                <div className="grid h-24 w-24 place-items-center rounded-full bg-gradient-primary shadow-glow transition-transform hover:scale-110">
                  {isPlaying ? <Pause className="h-10 w-10 text-primary-foreground" /> : <Play className="ml-1 h-10 w-10 text-primary-foreground" />}
                </div>
              </button>
              <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between bg-gradient-to-t from-black/60 to-transparent p-6">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon" onClick={togglePlay} className="text-white hover:bg-white/20">
                    {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={toggleMute} className="text-white hover:bg-white/20">
                    {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                  </Button>
                </div>
                <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="text-white hover:bg-white/20">
                  <Maximize className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </Reveal>

        <div className="grid gap-6 pt-6 md:grid-cols-3">
          {cards.map(({ Icon, title, text }, i) => (
            <Reveal key={title} delay={i * 0.1} direction="up">
              <div className="group h-full space-y-3 rounded-2xl border border-border/60 bg-card/40 p-6 transition-all duration-300 hover:-translate-y-2 hover:border-primary/50 hover:shadow-glow">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-primary shadow-glow transition-transform group-hover:scale-110">
                  <Icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="font-display text-xl font-bold">{title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ViewDemo;
