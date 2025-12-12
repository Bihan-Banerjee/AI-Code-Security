import { useState, useEffect } from "react";
import api from "@/lib/api";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-hot-toast";
import SecurityHeader from "@/components/SecurityHeader";
import { Eye, EyeOff, CheckCircle2, XCircle, Loader2, Mail, User, Lock } from "lucide-react";

// Disposable email domains (client-side check for instant feedback)
const DISPOSABLE_DOMAINS = [
  '10minutemail.com', 'tempmail.com', 'guerrillamail.com', 'mailinator.com',
  'throwaway.email', 'temp-mail.org', 'getnada.com', 'maildrop.cc',
  'trashmail.com', 'yopmail.com', 'fakeinbox.com', 'sharklasers.com'
];

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidatingEmail, setIsValidatingEmail] = useState(false);
  
  // Validation states
  const [emailValid, setEmailValid] = useState<boolean | null>(null);
  const [emailError, setEmailError] = useState("");
  const [usernameValid, setUsernameValid] = useState<boolean | null>(null);
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong' | null>(null);
  
  const navigate = useNavigate();

  // Email format validation
  const validateEmailFormat = (email: string): boolean => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  };

  // Check if email is disposable
  const isDisposableEmail = (email: string): boolean => {
    const domain = email.split('@')[1]?.toLowerCase();
    return DISPOSABLE_DOMAINS.includes(domain);
  };

  // Real-time email validation with debounce
  useEffect(() => {
    if (!email) {
      setEmailValid(null);
      setEmailError("");
      return;
    }

    // Basic format check (instant)
    if (!validateEmailFormat(email)) {
      setEmailValid(false);
      setEmailError("Invalid email format");
      return;
    }

    // Disposable check (instant)
    if (isDisposableEmail(email)) {
      setEmailValid(false);
      setEmailError("Disposable emails are not allowed");
      return;
    }

    // Debounce API call
    const timeoutId = setTimeout(async () => {
      setIsValidatingEmail(true);
      try {
        const response = await api.post("/api/validate-email", { email });
        if (response.data.valid) {
          setEmailValid(true);
          setEmailError("");
        } else {
          setEmailValid(false);
          setEmailError(response.data.error || "Email validation failed");
        }
      } catch (err: any) {
        // If validation endpoint doesn't exist, just do format check
        if (err.response?.status === 404) {
          setEmailValid(true);
          setEmailError("");
        } else {
          setEmailValid(false);
          setEmailError("Unable to verify email");
        }
      } finally {
        setIsValidatingEmail(false);
      }
    }, 800); // 800ms debounce

    return () => clearTimeout(timeoutId);
  }, [email]);

  // Username validation
  useEffect(() => {
    if (!username) {
      setUsernameValid(null);
      return;
    }

    if (username.length < 3) {
      setUsernameValid(false);
    } else if (username.length > 30) {
      setUsernameValid(false);
    } else if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      setUsernameValid(false);
    } else {
      setUsernameValid(true);
    }
  }, [username]);

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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!username || !email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    if (!usernameValid) {
      toast.error("Please enter a valid username (3-30 characters, alphanumeric)");
      return;
    }

    if (emailValid === false) {
      toast.error(emailError || "Please enter a valid email");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setIsLoading(true);

    try {
      const res = await api.post("/api/register", {
        username,
        email: email.toLowerCase(),
        password,
      });

      toast.success(res.data.message || "Registration successful! Please log in.");
      navigate("/login");
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || "Registration failed";
      toast.error(errorMsg);
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

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-white">
      <SecurityHeader />
      
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <User className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Create Account
            </h1>
            <p className="text-gray-600">
              Join us to secure your code with AI
            </p>
          </div>

          {/* Registration Form */}
          <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
            <form onSubmit={handleRegister} className="space-y-5">
              
              {/* Username Field */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Username
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Choose a username"
                    className={`pr-10 ${
                      usernameValid === true
                        ? "border-green-500 focus:ring-green-500"
                        : usernameValid === false
                        ? "border-red-500 focus:ring-red-500"
                        : ""
                    }`}
                    disabled={isLoading}
                  />
                  {usernameValid !== null && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {usernameValid ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                  )}
                </div>
                {username && !usernameValid && (
                  <p className="text-xs text-red-600">
                    3-30 characters, letters, numbers, underscore, and hyphen only
                  </p>
                )}
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email Address
                </label>
                <div className="relative">
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    className={`pr-10 ${
                      emailValid === true
                        ? "border-green-500 focus:ring-green-500"
                        : emailValid === false
                        ? "border-red-500 focus:ring-red-500"
                        : ""
                    }`}
                    disabled={isLoading}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {isValidatingEmail ? (
                      <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                    ) : emailValid === true ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : emailValid === false ? (
                      <XCircle className="w-5 h-5 text-red-500" />
                    ) : null}
                  </div>
                </div>
                {emailError && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    {emailError}
                  </p>
                )}
                {emailValid && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Email verified successfully
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Password
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a strong password"
                    className="pr-10"
                    disabled={isLoading}
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

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading || emailValid === false || usernameValid === false}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-6 rounded-xl shadow-lg hover:shadow-xl transition-all"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>

            {/* Login Link */}
            <div className="text-center pt-4 border-t">
              <p className="text-sm text-gray-600">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="text-blue-600 hover:text-blue-700 font-semibold"
                >
                  Sign In
                </Link>
              </p>
            </div>

            {/* Terms */}
            <p className="text-xs text-gray-500 text-center">
              By creating an account, you agree to our{" "}
              <Link to="/terms" className="text-blue-600 hover:underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link to="/privacy" className="text-blue-600 hover:underline">
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
