import { Shield, Users, Award, ChevronRight, Star, Target, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import SecurityHeader from "@/components/SecurityHeader";
import { useIsMobile } from "@/hooks/use-mobile"; 
import Footer from "@/components/Footer";
import { useNavigate } from "react-router-dom"; 
import BihanPic from "../assets/Bihan.jpeg";
import NethraPic from "../assets/Nethra.jpeg";

const About = () => {
  const isMobile = useIsMobile(); 
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <SecurityHeader />

      {/* Hero Section */}
      <section className="relative py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-primary-glow to-secondary bg-clip-text text-transparent">
              About SecureCode AI
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed">
              We're pioneering the future of code security through advanced AI technology,
              helping developers build safer applications with confidence.
            </p>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Our Mission</h2>
              <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                At SecureCode AI, we believe that security shouldn't be an afterthought.
                Our mission is to democratize code security by making advanced vulnerability
                detection accessible to every developer, regardless of their security expertise.
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Through cutting-edge AI and machine learning, we're transforming how
                security vulnerabilities are discovered, analyzed, and resolved in real-time.
              </p>
            </div>
            <div className="relative">
              <div className="w-full h-64 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-2xl flex items-center justify-center">
                <Target className="h-24 w-24 text-primary" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Values</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              The principles that guide everything we do
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-0 bg-background/60 backdrop-blur">
              <CardHeader className="text-center">
                <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>Security First</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center">
                  We prioritize security in every aspect of our platform,
                  ensuring your code and data remain protected.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-0 bg-background/60 backdrop-blur">
              <CardHeader className="text-center">
                <Users className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>Developer-Centric</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center">
                  We build tools by developers, for developers, focusing on
                  seamless integration into existing workflows.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-0 bg-background/60 backdrop-blur">
              <CardHeader className="text-center">
                <Award className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>Innovation</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center">
                  We constantly push the boundaries of what's possible
                  with AI-powered security analysis.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Team</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A diverse duo of a Security Expert, an AI Researcher, and Passionate Developers.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-8">
            {[
              {
                name: "Bihan Banerjee",
                role: "Cybersecurity Specialist",
                bio: "3rd year undergraduate student specializing in CSE Information Security at VIT Vellore.",
                image: BihanPic,
              },
              {
                name: "Nethra Krishnan",
                role: "AI Specialist",
                bio: "3rd year undergraduate student specializing in CSE Data Science at VIT Vellore.",
                image: NethraPic,
              },
            ].map((member) => (
              <Card key={member.name} className="text-center">
                <CardHeader>
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-20 h-20 rounded-full object-cover mx-auto mb-4 shadow-md"
                  />
                  <CardTitle className="text-xl">{member.name}</CardTitle>
                  <CardDescription className="text-primary font-medium">
                    {member.role}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{member.bio}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Future Goals Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Future Goals</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Building towards a safer, smarter, and more secure coding ecosystem
            </p>
          </div>

          <div className="rounded-2xl bg-muted/30 p-10 shadow-sm">
            <div className="grid md:grid-cols-3 gap-8 text-center">
              
              <div>
                <div className="text-4xl font-bold text-primary mb-2">
                   <Rocket className="h-12 w-12 text-primary mx-auto mb-4" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Global Expansion</h3>
                <p className="text-muted-foreground">
                  Bringing SecureCode AI to developers worldwide, setting a universal standard for secure coding.
                </p>
              </div>

              <div>
                <div className="text-4xl font-bold text-primary mb-2">
                  <Star className="h-12 w-12 text-primary mx-auto mb-4" />
                </div>
                <h3 className="text-xl font-semibold mb-2">AI Advancements</h3>
                <p className="text-muted-foreground">
                  Continuously evolving our AI to detect even the most complex and emerging vulnerabilities.
                </p>
              </div>

              <div>
                <div className="text-4xl font-bold text-primary mb-2">
                  <Target className="h-12 w-12 text-primary mx-auto mb-4" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Developer Ecosystem</h3>
                <p className="text-muted-foreground">
                  Building a collaborative ecosystem of developers, contributors, and researchers for a safer digital world.
                </p>
              </div>

            </div>
          </div>
        </div>
      </section>



      {/* Call to Action */}
      <section className="py-20 px-4 text-center">
        <div className="container mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Join the SecureCode AI Journey</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Be part of our mission to make secure coding accessible to all developers.  
            Let's build a safer digital future together.
          </p>
          <Button size="lg" className="px-6 py-3 text-lg" onClick={() => navigate("/dashboard")}>
            Get Started <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default About;
