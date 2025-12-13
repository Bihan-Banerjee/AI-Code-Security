import { ArrowLeft, Play, Pause, Volume2, VolumeX, Maximize, Shield, Zap, Rocket } from "lucide-react";
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
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-purple-50">
      <SecurityHeader />
      
      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Back Button */}
          <Link to="/">
            <Button 
              variant="ghost" 
              className="group font-semibold hover:bg-blue-50 hover:text-blue-600 transition-all"
            >
              <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
              Back to Home
            </Button>
          </Link>

          {/* Title Section */}
          <div className="text-center space-y-3">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Watch Our Demo
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              See how our platform works in action. This quick walkthrough will show you all the key features.
            </p>
          </div>

          {/* Video Container */}
          <div className="relative group rounded-2xl overflow-hidden border-2 border-blue-200 shadow-2xl bg-white">
            {/* Video Element */}
            <video
              ref={videoRef}
              className="w-full aspect-video bg-gray-900"
              poster="/placeholder.svg"
              onEnded={() => setIsPlaying(false)}
            >
              <source src={demoVideo} type="video/mp4" />
              Your browser does not support the video tag.
            </video>

            {/* Custom Controls Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              {/* Center Play Button */}
              <button
                onClick={togglePlay}
                className="absolute inset-0 flex items-center justify-center"
              >
                <div className="w-24 h-24 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 backdrop-blur-sm flex items-center justify-center transform hover:scale-110 transition-all duration-200 shadow-2xl">
                  {isPlaying ? (
                    <Pause className="h-10 w-10 text-white" />
                  ) : (
                    <Play className="h-10 w-10 text-white ml-1" />
                  )}
                </div>
              </button>

              {/* Bottom Controls */}
              <div className="absolute bottom-0 left-0 right-0 p-6 flex items-center justify-between bg-gradient-to-t from-black/60 to-transparent">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={togglePlay}
                    className="text-white hover:bg-white/20 hover:scale-110 transition-all"
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
                    className="text-white hover:bg-white/20 hover:scale-110 transition-all"
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
                  className="text-white hover:bg-white/20 hover:scale-110 transition-all"
                >
                  <Maximize className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Description Cards */}
          <div className="grid md:grid-cols-3 gap-6 pt-6">
            <div className="group p-6 rounded-xl bg-white border-2 border-blue-200 hover:border-blue-400 hover:shadow-xl hover:-translate-y-2 transition-all duration-300 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-bold text-xl text-gray-800">User Friendly</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Get started in minutes with our intuitive onboarding process and easy-to-use interface.
              </p>
            </div>

            <div className="group p-6 rounded-xl bg-white border-2 border-purple-200 hover:border-purple-400 hover:shadow-xl hover:-translate-y-2 transition-all duration-300 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-bold text-xl text-gray-800">Powerful Features</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Access all the tools you need to scan, enhance, and secure your code with AI precision.
              </p>
            </div>

            <div className="group p-6 rounded-xl bg-white border-2 border-green-200 hover:border-green-400 hover:shadow-xl hover:-translate-y-2 transition-all duration-300 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Rocket className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-bold text-xl text-gray-800">Launch Fast</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Scan and enhance your code with one click and deploy secure applications faster.
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
