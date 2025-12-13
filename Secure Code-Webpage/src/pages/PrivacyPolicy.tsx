import { Shield, ChevronRight, Lock, Eye, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import SecurityHeader from "@/components/SecurityHeader";
import Footer from "@/components/Footer";
import { useNavigate } from "react-router-dom";

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-purple-50">
      <SecurityHeader />

      {/* Enhanced Hero Section */}
      <section className="relative py-24 px-4 overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
        </div>
        
        <div className="container mx-auto relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            {/* Icon Badge */}
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 mb-6 shadow-lg animate-pulse">
              <Shield className="h-8 w-8 text-white" />
            </div>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent leading-tight">
              Privacy Policy
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 mb-12 leading-relaxed max-w-3xl mx-auto">
              Your privacy is important to us. It is FortiScan's policy to respect your privacy regarding any information we may collect from you across our website.
            </p>

            {/* Key Points Grid */}
            <div className="grid md:grid-cols-3 gap-6 mt-12">
              <div className="group bg-white border-2 border-blue-200 rounded-xl p-6 hover:shadow-xl hover:-translate-y-2 transition-all duration-300">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 mb-4 group-hover:scale-110 transition-transform">
                  <Lock className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-bold text-lg mb-2 text-gray-800">Data Protection</h3>
                <p className="text-sm text-gray-600">
                  Your information is securely stored and protected
                </p>
              </div>

              <div className="group bg-white border-2 border-purple-200 rounded-xl p-6 hover:shadow-xl hover:-translate-y-2 transition-all duration-300">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 mb-4 group-hover:scale-110 transition-transform">
                  <Eye className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-bold text-lg mb-2 text-gray-800">Transparency</h3>
                <p className="text-sm text-gray-600">
                  Clear information on how we use your data
                </p>
              </div>

              <div className="group bg-white border-2 border-green-200 rounded-xl p-6 hover:shadow-xl hover:-translate-y-2 transition-all duration-300">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-r from-green-500 to-green-600 mb-4 group-hover:scale-110 transition-transform">
                  <Database className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-bold text-lg mb-2 text-gray-800">Your Control</h3>
                <p className="text-sm text-gray-600">
                  You decide what information you share with us
                </p>
              </div>
            </div>

            {/* Last Updated Badge */}
            <div className="mt-12 inline-flex items-center gap-2 px-6 py-3 bg-white border-2 border-blue-200 rounded-full text-sm text-gray-700 font-semibold shadow-md">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
              Last updated: December 2025
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <ChevronRight className="h-6 w-6 text-gray-400 rotate-90" />
        </div>
      </section>

      {/* Privacy Policy Content Section */}
      <section className="py-16 px-4 bg-white">
        <div className="container mx-auto max-w-4xl">
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200 rounded-2xl p-8 md:p-12 space-y-12 shadow-xl">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Information We Collect
              </h2>
              <p className="text-lg text-gray-700 leading-relaxed">
                We only ask for personal information when we truly need it to provide a service to you. We collect it by fair and lawful means, with your knowledge and consent. We also let you know why we're collecting it and how it will be used.
              </p>
            </div>

            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                How We Use Your Information
              </h2>
              <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                We use the information we collect in various ways, including to:
              </p>
              <ul className="list-disc list-inside text-lg text-gray-700 space-y-3 leading-relaxed">
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
              <h2 className="text-3xl md:text-4xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Security
              </h2>
              <p className="text-lg text-gray-700 leading-relaxed">
                The security of your personal information is important to us, but remember that no method of transmission over the Internet, or method of electronic storage, is 100% secure. While we strive to use commercially acceptable means to protect your personal information, we cannot guarantee its absolute security.
              </p>
            </div>

            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Changes to This Privacy Policy
              </h2>
              <p className="text-lg text-gray-700 leading-relaxed">
                We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page. You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are effective when they are posted on this page.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 px-4 text-center bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="container mx-auto max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white">Questions?</h2>
          <p className="text-lg text-blue-100 mb-8">
            If you have any questions about our Privacy Policy, do not hesitate to contact us.
          </p>
          <Button 
            size="lg" 
            className="bg-white text-blue-600 hover:bg-gray-100 font-bold px-8 py-6 rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105" 
            onClick={() => navigate("/about")}
          >
            Contact Us <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      <Footer />

      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob { animation: blob 7s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
      `}</style>
    </div>
  );
};

export default PrivacyPolicy;
