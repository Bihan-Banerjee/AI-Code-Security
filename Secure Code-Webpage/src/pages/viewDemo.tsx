import { ArrowLeft, Play, Pause, Volume2, VolumeX, Maximize } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useState, useRef } from "react";
import demoVideo from "@/assets/demovideo.mp4";
import Footer from "@/components/Footer";
import SecurityHeader from "@/components/SecurityHeader";

const ViewDemo = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = () => {
    if (videoRef.current) {
      videoRef.current.requestFullscreen();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SecurityHeader />
      {/* Main Content */}
      <main className="container mx-auto px-6 py-12">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Title Section */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">
              Watch Our Demo
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              See how our platform works in action. This quick walkthrough will show you all the key features.
            </p>
          </div>

          {/* Video Container */}
          <div className="relative group rounded-2xl overflow-hidden border border-border/50 shadow-2xl shadow-primary/10 bg-card">
            {/* Video Element */}
            <video
                ref={videoRef}
                className="w-full aspect-video bg-muted"
                poster="/placeholder.svg"
                onEnded={() => setIsPlaying(false)}
                >
                <source src={demoVideo} type="video/mp4" />
                Your browser does not support the video tag.
            </video>


            {/* Custom Controls Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              {/* Center Play Button */}
              <button
                onClick={togglePlay}
                className="absolute inset-0 flex items-center justify-center"
              >
                <div className="w-20 h-20 rounded-full bg-primary/90 backdrop-blur-sm flex items-center justify-center transform hover:scale-110 transition-transform duration-200 shadow-lg">
                  {isPlaying ? (
                    <Pause className="h-8 w-8 text-primary-foreground" />
                  ) : (
                    <Play className="h-8 w-8 text-primary-foreground ml-1" />
                  )}
                </div>
              </button>

              {/* Bottom Controls */}
              <div className="absolute bottom-0 left-0 right-0 p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={togglePlay}
                    className="text-white hover:bg-white/20"
                  >
                    {isPlaying ? (
                      <Pause className="h-5 w-5" />
                    ) : (
                      <Play className="h-5 w-5" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleMute}
                    className="text-white hover:bg-white/20"
                  >
                    {isMuted ? (
                      <VolumeX className="h-5 w-5" />
                    ) : (
                      <Volume2 className="h-5 w-5" />
                    )}
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleFullscreen}
                  className="text-white hover:bg-white/20"
                >
                  <Maximize className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Description Cards */}
          <div className="grid md:grid-cols-3 gap-6 pt-8">
            <div className="p-6 rounded-xl bg-card border border-border/50 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-bold">1</span>
              </div>
              <h3 className="font-semibold text-foreground">User Friendly</h3>
              <p className="text-sm text-muted-foreground">
                Get started in minutes with our intuitive onboarding process.
              </p>
            </div>
            <div className="p-6 rounded-xl bg-card border border-border/50 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-bold">2</span>
              </div>
              <h3 className="font-semibold text-foreground">Powerful Features</h3>
              <p className="text-sm text-muted-foreground">
                Access all the tools you need to secure your code.
              </p>
            </div>
            <div className="p-6 rounded-xl bg-card border border-border/50 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-bold">3</span>
              </div>
              <h3 className="font-semibold text-foreground">Launch Fast</h3>
              <p className="text-sm text-muted-foreground">
                Scan and Enhance your code with one click and share it with the world.
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ViewDemo;
