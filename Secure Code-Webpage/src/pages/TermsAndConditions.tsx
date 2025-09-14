import { FileText, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import SecurityHeader from "@/components/SecurityHeader";
import Footer from "@/components/Footer";
import { useNavigate } from "react-router-dom";

const TermsAndConditions = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <SecurityHeader />

      {/* Hero Section */}
      <section className="relative py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-primary-glow to-secondary bg-clip-text text-transparent">
              Terms and Conditions
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed">
              Please read these terms and conditions carefully before using Our Service.
            </p>
          </div>
        </div>
      </section>

      {/* Terms and Conditions Content Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Interpretation and Definitions</h2>
          <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
            The words of which the initial letter is capitalized have meanings defined under the following conditions. The following definitions shall have the same meaning regardless of whether they appear in singular or in plural.
          </p>

          <h2 className="text-3xl md:text-4xl font-bold mb-6">Acknowledgment</h2>
          <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
            These are the Terms and Conditions governing the use of this Service and the agreement that operates between You and the Company. These Terms and Conditions set out the rights and obligations of all users regarding the use of the Service.
          </p>

          <h2 className="text-3xl md:text-4xl font-bold mb-6">Limitation of Liability</h2>
          <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
            To the maximum extent permitted by applicable law, in no event shall the Company or its suppliers be liable for any special, incidental, indirect, or consequential damages whatsoever (including, but not limited to, damages for loss of profits, for loss of data or other information, for business interruption, for personal injury, for loss of privacy arising out of or in any way related to the use of or inability to use the Service, third-party software and/or third-party hardware used with the Service, or otherwise in connection with any provision of this Terms), even if the Company or any supplier has been advised of the possibility of such damages and even if the remedy fails of its essential purpose.
          </p>

          <h2 className="text-3xl md:text-4xl font-bold mb-6">"AS IS" and "AS AVAILABLE" Disclaimer</h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            The Service is provided to You "AS IS" and "AS AVAILABLE" and with all faults and defects without warranty of any kind. To the maximum extent permitted under applicable law, the Company, on its own behalf and on behalf of its Affiliates and its and their respective licensors and service providers, expressly disclaims all warranties, whether express, implied, statutory or otherwise, with respect to the Service, including all implied warranties of merchantability, fitness for a particular purpose, title and non-infringement, and warranties that may arise out of course of dealing, course of performance, usage or trade practice.
          </p>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 px-4 text-center">
        <div className="container mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Questions?</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            If you have any questions about our Terms and Conditions, do not hesitate to contact us.
          </p>
          <Button size="lg" className="px-6 py-3 text-lg" onClick={() => navigate("/about")}>
            Contact Us <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default TermsAndConditions;