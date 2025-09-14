import { Shield, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import SecurityHeader from "@/components/SecurityHeader";
import Footer from "@/components/Footer";
import { useNavigate } from "react-router-dom";

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <SecurityHeader />

      {/* Hero Section */}
      <section className="relative py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-primary-glow to-secondary bg-clip-text text-transparent">
              Privacy Policy
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed">
              Your privacy is important to us. It is SecureCode AI's policy to respect your privacy regarding any information we may collect from you across our website.
            </p>
          </div>
        </div>
      </section>

      {/* Privacy Policy Content Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Information We Collect</h2>
          <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
            We only ask for personal information when we truly need it to provide a service to you. We collect it by fair and lawful means, with your knowledge and consent. We also let you know why we’re collecting it and how it will be used.
          </p>

          <h2 className="text-3xl md:text-4xl font-bold mb-6">How We Use Your Information</h2>
          <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
            We use the information we collect in various ways, including to:
          </p>
          <ul className="list-disc list-inside text-lg text-muted-foreground mb-6 leading-relaxed">
            <li>Provide, operate, and maintain our website</li>
            <li>Improve, personalize, and expand our website</li>
            <li>Understand and analyze how you use our website</li>
            <li>Develop new products, services, features, and functionality</li>
            <li>Communicate with you, either directly or through one of our partners, including for customer service, to provide you with updates and other information relating to the website, and for marketing and promotional purposes</li>
            <li>Send you emails</li>
            <li>Find and prevent fraud</li>
          </ul>

          <h2 className="text-3xl md:text-4xl font-bold mb-6">Security</h2>
          <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
            The security of your personal information is important to us, but remember that no method of transmission over the Internet, or method of electronic storage, is 100% secure. While we strive to use commercially acceptable means to protect your personal information, we cannot guarantee its absolute security.
          </p>

          <h2 className="text-3xl md:text-4xl font-bold mb-6">Changes to This Privacy Policy</h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page. You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are effective when they are posted on this page.
          </p>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 px-4 text-center">
        <div className="container mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Questions?</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            If you have any questions about our Privacy Policy, do not hesitate to contact us.
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

export default PrivacyPolicy;