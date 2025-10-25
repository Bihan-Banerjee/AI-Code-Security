import { FileText, ChevronRight, Scale, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import SecurityHeader from "@/components/SecurityHeader";
import Footer from "@/components/Footer";
import { useNavigate } from "react-router-dom";

const TermsAndConditions = () => {
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
              <FileText className="h-8 w-8 text-primary" />
            </div>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary via-primary-glow to-secondary bg-clip-text text-transparent leading-tight">
              Terms and Conditions
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground mb-12 leading-relaxed max-w-3xl mx-auto">
              Please read these terms and conditions carefully before using Our Service.
            </p>

            {/* Key Points Grid */}
            <div className="grid md:grid-cols-3 gap-6 mt-12">
              <div className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 mb-4">
                  <Scale className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Legal Agreement</h3>
                <p className="text-sm text-muted-foreground">
                  Binding terms between you and our company
                </p>
              </div>

              <div className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 mb-4">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Your Rights</h3>
                <p className="text-sm text-muted-foreground">
                  Understanding your obligations and protections
                </p>
              </div>

              <div className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 mb-4">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Service Use</h3>
                <p className="text-sm text-muted-foreground">
                  Guidelines for using our platform safely
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

      {/* Terms and Conditions Content Section */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-4xl">
          <div className="bg-card border border-border rounded-2xl p-8 md:p-12 space-y-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Interpretation and Definitions</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                The words of which the initial letter is capitalized have meanings defined under the following conditions. The following definitions shall have the same meaning regardless of whether they appear in singular or in plural.
              </p>
            </div>

            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Acknowledgment</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                These are the Terms and Conditions governing the use of this Service and the agreement that operates between You and the Company. These Terms and Conditions set out the rights and obligations of all users regarding the use of the Service.
              </p>
            </div>

            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Limitation of Liability</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                To the maximum extent permitted by applicable law, in no event shall the Company or its suppliers be liable for any special, incidental, indirect, or consequential damages whatsoever (including, but not limited to, damages for loss of profits, for loss of data or other information, for business interruption, for personal injury, for loss of privacy arising out of or in any way related to the use of or inability to use the Service, third-party software and/or third-party hardware used with the Service, or otherwise in connection with any provision of this Terms), even if the Company or any supplier has been advised of the possibility of such damages and even if the remedy fails of its essential purpose.
              </p>
            </div>

            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">"AS IS" and "AS AVAILABLE" Disclaimer</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                The Service is provided to You "AS IS" and "AS AVAILABLE" and with all faults and defects without warranty of any kind. To the maximum extent permitted under applicable law, the Company, on its own behalf and on behalf of its Affiliates and its and their respective licensors and service providers, expressly disclaims all warranties, whether express, implied, statutory or otherwise, with respect to the Service, including all implied warranties of merchantability, fitness for a particular purpose, title and non-infringement, and warranties that may arise out of course of dealing, course of performance, usage or trade practice.
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
              If you have any questions about our Terms and Conditions, do not hesitate to contact us.
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

export default TermsAndConditions;