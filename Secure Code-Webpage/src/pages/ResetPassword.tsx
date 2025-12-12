import { useState, useEffect } from "react";
import api from "@/lib/api";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { toast } from "react-hot-toast";
import SecurityHeader from "@/components/SecurityHeader";
import { Lock, Eye, EyeOff, CheckCircle2, Loader2, XCircle, AlertCircle } from "lucide-react";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong' | null>(null);

  // Verify token on mount
  useEffect(() => {
    const tokenParam = searchParams.get("token");
    
    if (!tokenParam) {
      toast.error("Invalid reset link");
      navigate("/login");
      return;
    }
    
    setToken(tokenParam);
    verifyToken(tokenParam);
  }, [searchParams, navigate]);

  const verifyToken = async (tokenToVerify: string) => {
    setIsVerifying(true);
    try {
      const res = await api.post("/api/verify-reset-token", { token: tokenToVerify });
      if (res.data.valid) {
        setTokenValid(true);
      } else {
        toast.error(res.data.error || "Invalid or expired reset link");
        setTimeout(() => navigate("/forgot-password"), 2000);
      }
    } catch (err: any) {
      toast.error("Invalid or expired reset link");
      setTimeout(() => navigate("/forgot-password"), 2000);
    } finally {
      setIsVerifying(false);
    }
  };

  // Password strength check
  useEffect(() => {
    if (!password) {
      setPasswordStrength(null);
      return;
    }

    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;

    if (strength <= 2) setPasswordStrength('weak');
    else if (strength <= 3) setPasswordStrength('medium');
    else setPasswordStrength('strong');
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      await api.post("/api/reset-password", {
        token,
        password,
      });

      toast.success("Password reset successfully! Please login.");
      navigate("/login");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to reset password");
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength === 'weak') return 'bg-red-500';
    if (passwordStrength === 'medium') return 'bg-yellow-500';
    if (passwordStrength === 'strong') return 'bg-green-500';
    return 'bg-gray-300';
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength === 'weak') return 'Weak';
    if (passwordStrength === 'medium') return 'Medium';
    if (passwordStrength === 'strong') return 'Strong';
    return '';
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-white">
        <SecurityHeader />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Verifying reset link...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-white">
        <SecurityHeader />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Reset Link</h2>
            <p className="text-gray-600 mb-6">
              This password reset link is invalid or has expired.
            </p>
            <Link to="/forgot-password">
              <Button className="w-full">Request New Reset Link</Button>
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-white">
      <SecurityHeader />

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <Lock className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Reset Your Password
            </h1>
            <p className="text-gray-600">
              Enter your new password below
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* New Password Field */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  New Password
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a strong password"
                    className="h-12 pr-10"
                    disabled={isLoading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                
                {/* Password Strength Indicator */}
                {password && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${getPasswordStrengthColor()}`}
                          style={{
                            width:
                              passwordStrength === 'weak'
                                ? '33%'
                                : passwordStrength === 'medium'
                                ? '66%'
                                : passwordStrength === 'strong'
                                ? '100%'
                                : '0%',
                          }}
                        />
                      </div>
                      <span
                        className={`text-xs font-medium ${
                          passwordStrength === 'weak'
                            ? 'text-red-600'
                            : passwordStrength === 'medium'
                            ? 'text-yellow-600'
                            : 'text-green-600'
                        }`}
                      >
                        {getPasswordStrengthText()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Use 8+ characters with uppercase, lowercase, numbers & symbols
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Confirm Password
                </label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    className="h-12 pr-10"
                    disabled={isLoading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    Passwords do not match
                  </p>
                )}
                {confirmPassword && password === confirmPassword && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Passwords match
                  </p>
                )}
              </div>

              {/* Security Notice */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <p className="font-semibold mb-1">Security Tips</p>
                    <ul className="text-blue-700 space-y-1 text-xs">
                      <li>• Use a unique password you haven't used before</li>
                      <li>• Include uppercase, lowercase, numbers, and symbols</li>
                      <li>• Avoid common words and personal information</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading || password !== confirmPassword || !password}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-6 rounded-xl shadow-lg hover:shadow-xl transition-all"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Resetting Password...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    Reset Password
                  </>
                )}
              </Button>
            </form>

            {/* Login Link */}
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
        </div>
      </div>

      <Footer />
    </div>
  );
}
