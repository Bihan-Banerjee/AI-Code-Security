import { Shield, ChevronRight, Lock, Eye, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import SecurityHeader from "@/components/SecurityHeader";
import Footer from "@/components/Footer";
import { useNavigate } from "react-router-dom";

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <SecurityHeader />

      {/* Enhanced Hero Section */}
      <section className="relative py-24 px-4 overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary rounded-full blur-3xl"></div>
        </div>
        
        <div className="container mx-auto relative z-10">

          <div className="text-center max-w-4xl mx-auto">
            {/* Icon Badge */}
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
              <Shield className="h-8 w-8 text-primary" />
            </div>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary via-primary-glow to-secondary bg-clip-text text-transparent leading-tight">
              Privacy Policy
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground mb-12 leading-relaxed max-w-3xl mx-auto">
              Your privacy is important to us. It is SecureCode AI's policy to respect your privacy regarding any information we may collect from you across our website.
            </p>

            {/* Key Points Grid */}
            <div className="grid md:grid-cols-3 gap-6 mt-12">
              <div className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 mb-4">
                  <Lock className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Data Protection</h3>
                <p className="text-sm text-muted-foreground">
                  Your information is securely stored and protected
                </p>
              </div>

              <div className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 mb-4">
                  <Eye className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Transparency</h3>
                <p className="text-sm text-muted-foreground">
                  Clear information on how we use your data
                </p>
              </div>

              <div className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 mb-4">
                  <Database className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Your Control</h3>
                <p className="text-sm text-muted-foreground">
                  You decide what information you share with us
                </p>
              </div>
            </div>

            {/* Last Updated Badge */}
            <div className="mt-12 inline-flex items-center gap-2 px-4 py-2 bg-muted rounded-full text-sm text-muted-foreground">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
              Last updated: October 2025
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <ChevronRight className="h-6 w-6 text-muted-foreground rotate-90" />
        </div>
      </section>

      {/* Privacy Policy Content Section */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-4xl">
          <div className="bg-card border border-border rounded-2xl p-8 md:p-12 space-y-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Information We Collect</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                We only ask for personal information when we truly need it to provide a service to you. We collect it by fair and lawful means, with your knowledge and consent. We also let you know why we're collecting it and how it will be used.
              </p>
            </div>

            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">How We Use Your Information</h2>
              <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                We use the information we collect in various ways, including to:
              </p>
              <ul className="list-disc list-inside text-lg text-muted-foreground space-y-2 leading-relaxed">
                <li>Provide, operate, and maintain our website</li>
                <li>Improve, personalize, and expand our website</li>
                <li>Understand and analyze how you use our website</li>
                <li>Develop new products, services, features, and functionality</li>
                <li>Communicate with you, either directly or through one of our partners, including for customer service, to provide you with updates and other information relating to the website, and for marketing and promotional purposes</li>
                <li>Send you emails</li>
                <li>Find and prevent fraud</li>
              </ul>
            </div>

            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Security</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                The security of your personal information is important to us, but remember that no method of transmission over the Internet, or method of electronic storage, is 100% secure. While we strive to use commercially acceptable means to protect your personal information, we cannot guarantee its absolute security.
              </p>
            </div>

            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Changes to This Privacy Policy</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page. You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are effective when they are posted on this page.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 px-4 text-center">
        <div className="container mx-auto max-w-3xl">
          <div className="bg-gradient-to-br from-primary/5 via-primary-glow/5 to-secondary/5 rounded-3xl p-12 border border-border">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Questions?</h2>
            <p className="text-lg text-muted-foreground mb-8">
              If you have any questions about our Privacy Policy, do not hesitate to contact us.
            </p>
            <Button size="lg" className="px-6 py-3 text-lg" onClick={() => navigate("/about")}>
              Contact Us <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default PrivacyPolicy;