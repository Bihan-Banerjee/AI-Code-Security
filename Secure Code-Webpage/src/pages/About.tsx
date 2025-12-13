import { Shield, Users, Award, ChevronRight, Star, Target, Rocket, Lock, Code, Zap, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import SecurityHeader from "@/components/SecurityHeader";
import Footer from "@/components/Footer";
import { useNavigate } from "react-router-dom";
import BihanPic from "../assets/Bihan.jpeg";
import NethraPic from "../assets/Nethra.jpeg";


const About = () => {
  const navigate = useNavigate();


  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-purple-50">
      <SecurityHeader />


      {/* Hero Section */}
      <section className="relative py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 mb-6 shadow-lg animate-pulse">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              About FortiScan
            </h1>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              We're pioneering the future of code security through advanced AI technology,
              helping developers build safer applications with confidence.
            </p>
          </div>
        </div>
      </section>


      {/* Mission Section with Animated Graphic */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Our Mission
              </h2>
              <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                At FortiScan, we believe that security shouldn't be an afterthought.
                Our mission is to democratize code security by making advanced vulnerability
                detection accessible to every developer, regardless of their security expertise.
              </p>
              <p className="text-lg text-gray-700 leading-relaxed">
                Through cutting-edge AI and machine learning, we're transforming how
                security vulnerabilities are discovered, analyzed, and resolved in real-time.
              </p>
            </div>


            {/* Animated Mission Graphic */}
            <div className="relative flex items-center justify-center h-96">
              {/* Rotating Outer Ring */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-80 h-80 rounded-full border-4 border-blue-200 animate-spin-slow"></div>
              </div>


              {/* Pulsing Middle Ring */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-64 h-64 rounded-full border-2 border-purple-200 animate-pulse"></div>
              </div>


              {/* Center Target Icon */}
              <div className="relative z-10">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl blur-2xl opacity-40 animate-pulse"></div>
                <div className="relative bg-gradient-to-br from-blue-500 to-purple-600 p-8 rounded-2xl shadow-2xl">
                  <Target className="h-20 w-20 text-white" />
                </div>
              </div>


              {/* Floating Security Icons */}
              <div className="absolute top-8 left-8 animate-float">
                <div className="bg-blue-100 p-4 rounded-xl shadow-lg">
                  <Shield className="w-8 h-8 text-blue-600" />
                </div>
              </div>


              <div className="absolute top-8 right-8 animate-float animation-delay-1000">
                <div className="bg-purple-100 p-4 rounded-xl shadow-lg">
                  <Lock className="w-8 h-8 text-purple-600" />
                </div>
              </div>


              <div className="absolute bottom-8 left-8 animate-float animation-delay-2000">
                <div className="bg-green-100 p-4 rounded-xl shadow-lg">
                  <Code className="w-8 h-8 text-green-600" />
                </div>
              </div>


              <div className="absolute bottom-8 right-8 animate-float animation-delay-3000">
                <div className="bg-pink-100 p-4 rounded-xl shadow-lg">
                  <Eye className="w-8 h-8 text-pink-600" />
                </div>
              </div>


              {/* Orbiting Dots */}
              <div className="absolute inset-0 flex items-center justify-center animate-spin-slow">
                <div className="w-72 h-72 relative">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-blue-500 rounded-full shadow-lg"></div>
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-purple-500 rounded-full shadow-lg"></div>
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-green-500 rounded-full shadow-lg"></div>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-pink-500 rounded-full shadow-lg"></div>
                </div>
              </div>


              {/* Background Glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl opacity-20"></div>
            </div>
          </div>
        </div>
      </section>


      {/* Values Section */}
      <section className="py-16 px-4 bg-white">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Our Values
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              The principles that guide everything we do
            </p>
          </div>
         
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="group border-2 border-blue-200 hover:border-blue-400 hover:shadow-xl transition-all duration-300 hover:-translate-y-2 bg-gradient-to-br from-white to-blue-50">
              <CardHeader className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Shield className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-xl">Security First</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center text-gray-600">
                  We prioritize security in every aspect of our platform,
                  ensuring your code and data remain protected.
                </CardDescription>
              </CardContent>
            </Card>


            <Card className="group border-2 border-purple-200 hover:border-purple-400 hover:shadow-xl transition-all duration-300 hover:-translate-y-2 bg-gradient-to-br from-white to-purple-50">
              <CardHeader className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-xl">Developer-Centric</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center text-gray-600">
                  We build tools by developers, for developers, focusing on
                  seamless integration into existing workflows.
                </CardDescription>
              </CardContent>
            </Card>


            <Card className="group border-2 border-green-200 hover:border-green-400 hover:shadow-xl transition-all duration-300 hover:-translate-y-2 bg-gradient-to-br from-white to-green-50">
              <CardHeader className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-r from-green-500 to-green-600 mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Award className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-xl">Innovation</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center text-gray-600">
                  We constantly push the boundaries of what's possible
                  with AI-powered security analysis.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>


      {/* Team Section */}
      <section className="py-16 px-4 bg-gradient-to-b from-white to-gray-50">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Our Team
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              A diverse duo of a Security Expert, an AI Researcher, and Passionate Developers.
            </p>
          </div>
         
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {[
              {
                name: "Bihan Banerjee",
                role: "Cybersecurity Specialist",
                bio: "3rd year undergraduate student specializing in CSE Information Security at VIT Vellore.",
                image: BihanPic,
                color: "from-blue-500 to-blue-600"
              },
              {
                name: "Nethra Krishnan",
                role: "AI Specialist",
                bio: "3rd year undergraduate student specializing in CSE Data Science at VIT Vellore.",
                image: NethraPic,
                color: "from-purple-500 to-purple-600"
              },
            ].map((member) => (
              <Card key={member.name} className="group text-center border-2 border-gray-200 hover:border-blue-300 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
                <CardHeader>
                  <div className="relative inline-block mx-auto mb-4">
                    <div className={`absolute inset-0 bg-gradient-to-r ${member.color} rounded-full blur-lg opacity-50 group-hover:opacity-75 transition-opacity`}></div>
                    <img
                      src={member.image}
                      alt={member.name}
                      className="relative w-24 h-24 rounded-full object-cover shadow-lg border-4 border-white"
                    />
                  </div>
                  <CardTitle className="text-2xl font-bold">{member.name}</CardTitle>
                  <CardDescription className={`font-semibold text-lg bg-gradient-to-r ${member.color} bg-clip-text text-transparent`}>
                    {member.role}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{member.bio}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>


      {/* Future Goals Section */}
      <section className="py-16 px-4 bg-white">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Our Future Goals
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Building towards a safer, smarter, and more secure coding ecosystem
            </p>
          </div>


          <div className="grid md:grid-cols-3 gap-8">
            <Card className="group text-center border-2 border-blue-200 hover:shadow-xl transition-all duration-300 hover:-translate-y-2 bg-gradient-to-br from-white to-blue-50">
              <CardHeader>
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 mx-auto mb-4 group-hover:scale-110 group-hover:rotate-6 transition-all">
                  <Rocket className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-xl">Global Expansion</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Bringing FortiScan to developers worldwide, setting a universal standard for secure coding.
                </p>
              </CardContent>
            </Card>


            <Card className="group text-center border-2 border-purple-200 hover:shadow-xl transition-all duration-300 hover:-translate-y-2 bg-gradient-to-br from-white to-purple-50">
              <CardHeader>
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 mx-auto mb-4 group-hover:scale-110 group-hover:rotate-6 transition-all">
                  <Star className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-xl">AI Advancements</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Continuously evolving our AI to detect even the most complex and emerging vulnerabilities.
                </p>
              </CardContent>
            </Card>


            <Card className="group text-center border-2 border-green-200 hover:shadow-xl transition-all duration-300 hover:-translate-y-2 bg-gradient-to-br from-white to-green-50">
              <CardHeader>
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-r from-green-500 to-green-600 mx-auto mb-4 group-hover:scale-110 group-hover:rotate-6 transition-all">
                  <Target className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-xl">Developer Ecosystem</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Building a collaborative ecosystem of developers, contributors, and researchers for a safer digital world.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>


      {/* Call to Action */}
      <section className="py-20 px-4 text-center bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="container mx-auto">
          <h2 className="text-4xl font-bold mb-6 text-white">Join the FortiScan Journey</h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Be part of our mission to make secure coding accessible to all developers.  
            Let's build a safer digital future together.
          </p>
          <Button
            size="lg"
            onClick={() => navigate("/dashboard")}
            className="bg-white text-blue-600 hover:bg-gray-100 font-bold px-8 py-6 rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105"
          >
            Get Started <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>


      <Footer />


      {/* Custom Animations */}
      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }


        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }


        .animate-spin-slow { animation: spin-slow 20s linear infinite; }
        .animate-float { animation: float 3s ease-in-out infinite; }
        .animation-delay-1000 { animation-delay: 1s; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-3000 { animation-delay: 3s; }
      `}</style>
    </div>
  );
};


export default About;