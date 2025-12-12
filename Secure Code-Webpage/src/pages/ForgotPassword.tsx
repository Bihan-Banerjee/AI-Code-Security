import { useState } from "react";
import api from "@/lib/api";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { toast } from "react-hot-toast";
import SecurityHeader from "@/components/SecurityHeader";
import { Mail, ArrowLeft, CheckCircle2, Loader2, AlertCircle } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    try {
      const res = await api.post("/api/forgot-password", { email: email.toLowerCase() });
      
      toast.success("Check your email for reset instructions");
      setEmailSent(true);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to send reset email");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-white">
      <SecurityHeader />

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Back to Login Link */}
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-8 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Link>

          {!emailSent ? (
            <>
              {/* Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                  <Mail className="w-8 h-8 text-blue-600" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Forgot Password?
                </h1>
                <p className="text-gray-600">
                  No worries! Enter your email and we'll send you reset instructions.
                </p>
              </div>

              {/* Form Card */}
              <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
                <form onSubmit={handleSubmit} className="space-y-5">
                  
                  {/* Email Field */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Email Address
                    </label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your.email@example.com"
                      className="h-12"
                      disabled={isLoading}
                      required
                    />
                  </div>

                  {/* Security Notice */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex gap-3">
                      <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-blue-900">
                        <p className="font-semibold mb-1">Security Notice</p>
                        <p className="text-blue-700">
                          For your security, we'll send a password reset link to your registered email address. 
                          The link will expire in 1 hour.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-6 rounded-xl shadow-lg hover:shadow-xl transition-all"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Sending Reset Link...
                      </>
                    ) : (
                      <>
                        <Mail className="w-5 h-5 mr-2" />
                        Send Reset Link
                      </>
                    )}
                  </Button>
                </form>

                {/* Additional Help */}
                <div className="text-center pt-4 border-t">
                  <p className="text-sm text-gray-600">
                    Remember your password?{" "}
                    <Link
                      to="/login"
                      className="text-blue-600 hover:text-blue-700 font-semibold"
                    >
                      Sign In
                    </Link>
                  </p>
                </div>
              </div>
            </>
          ) : (
            /* Success Message */
            <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              
              <div className="space-y-3">
                <h2 className="text-2xl font-bold text-gray-900">
                  Check Your Email
                </h2>
                <p className="text-gray-600">
                  We've sent password reset instructions to:
                </p>
                <p className="text-lg font-semibold text-blue-600">
                  {email}
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left">
                <p className="text-sm text-yellow-900 font-medium mb-2">
                  📬 Didn't receive the email?
                </p>
                <ul className="text-xs text-yellow-800 space-y-1 ml-4 list-disc">
                  <li>Check your spam or junk folder</li>
                  <li>Make sure you entered the correct email</li>
                  <li>Wait a few minutes for the email to arrive</li>
                </ul>
              </div>

              <div className="space-y-3 pt-4">
                <Button
                  onClick={() => {
                    setEmailSent(false);
                    setEmail("");
                  }}
                  variant="outline"
                  className="w-full h-12"
                >
                  Try Another Email
                </Button>
                
                <Link to="/login">
                  <Button variant="ghost" className="w-full h-12">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Login
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
