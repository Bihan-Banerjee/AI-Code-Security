import { useState, useEffect } from "react";
import { AxiosError } from "axios";
import api from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import AuthShell from "@/components/layout/AuthShell";
import { Eye, EyeOff, CheckCircle2, XCircle, Loader2, Mail, User, Lock } from "lucide-react";

const DISPOSABLE_DOMAINS = [
  "10minutemail.com", "tempmail.com", "guerrillamail.com", "mailinator.com",
  "throwaway.email", "temp-mail.org", "getnada.com", "maildrop.cc",
  "trashmail.com", "yopmail.com", "fakeinbox.com", "sharklasers.com",
];

type Strength = "weak" | "medium" | "strong" | null;

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidatingEmail, setIsValidatingEmail] = useState(false);

  const [emailValid, setEmailValid] = useState<boolean | null>(null);
  const [emailError, setEmailError] = useState("");
  const [usernameValid, setUsernameValid] = useState<boolean | null>(null);
  const [passwordStrength, setPasswordStrength] = useState<Strength>(null);

  const navigate = useNavigate();

  const validateEmailFormat = (e: string) => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(e);
  const isDisposableEmail = (e: string) => DISPOSABLE_DOMAINS.includes(e.split("@")[1]?.toLowerCase());

  useEffect(() => {
    if (!email) {
      setEmailValid(null);
      setEmailError("");
      return;
    }
    if (!validateEmailFormat(email)) {
      setEmailValid(false);
      setEmailError("Invalid email format");
      return;
    }
    if (isDisposableEmail(email)) {
      setEmailValid(false);
      setEmailError("Disposable emails are not allowed");
      return;
    }
    const t = setTimeout(async () => {
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
      } catch (err) {
        if ((err as AxiosError).response?.status === 404) {
          setEmailValid(true);
          setEmailError("");
        } else {
          setEmailValid(false);
          setEmailError("Unable to verify email");
        }
      } finally {
        setIsValidatingEmail(false);
      }
    }, 800);
    return () => clearTimeout(t);
  }, [email]);

  useEffect(() => {
    if (!username) return setUsernameValid(null);
    setUsernameValid(username.length >= 3 && username.length <= 30 && /^[a-zA-Z0-9_-]+$/.test(username));
  }, [username]);

  useEffect(() => {
    if (!password) return setPasswordStrength(null);
    let s = 0;
    if (password.length >= 8) s++;
    if (password.length >= 12) s++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) s++;
    if (/\d/.test(password)) s++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) s++;
    setPasswordStrength(s <= 2 ? "weak" : s <= 3 ? "medium" : "strong");
  }, [password]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !email || !password) return toast.error("Please fill in all fields");
    if (!usernameValid) return toast.error("Enter a valid username (3-30 chars, alphanumeric)");
    if (emailValid === false) return toast.error(emailError || "Please enter a valid email");
    if (password.length < 8) return toast.error("Password must be at least 8 characters");
    setIsLoading(true);
    try {
      const res = await api.post("/api/register", { username, email: email.toLowerCase(), password });
      toast.success(res.data.message || "Registration successful! Please log in.");
      navigate("/login");
    } catch (err) {
      toast.error(getErrorMessage(err, "Registration failed"));
    } finally {
      setIsLoading(false);
    }
  };

  const strengthColor = passwordStrength === "weak" ? "bg-destructive" : passwordStrength === "medium" ? "bg-warning" : "bg-success";
  const strengthWidth = passwordStrength === "weak" ? "33%" : passwordStrength === "medium" ? "66%" : passwordStrength === "strong" ? "100%" : "0%";
  const strengthText = passwordStrength === "weak" ? "text-destructive" : passwordStrength === "medium" ? "text-warning" : "text-success";

  return (
    <AuthShell>
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-primary shadow-glow">
          <User className="h-8 w-8 text-primary-foreground" />
        </div>
        <h1 className="font-display text-3xl font-bold">Create account</h1>
        <p className="mt-1 text-muted-foreground">Join us to secure your code with AI</p>
      </div>

      <div className="glass-strong space-y-6 rounded-2xl p-8">
        <form onSubmit={handleRegister} className="space-y-5">
          {/* Username */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-foreground/80">
              <User className="h-4 w-4" /> Username
            </label>
            <div className="relative">
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Choose a username"
                className={`pr-10 ${usernameValid === true ? "border-success" : usernameValid === false ? "border-destructive" : ""}`}
                disabled={isLoading}
              />
              {usernameValid !== null && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {usernameValid ? <CheckCircle2 className="h-5 w-5 text-success" /> : <XCircle className="h-5 w-5 text-destructive" />}
                </div>
              )}
            </div>
            {username && !usernameValid && (
              <p className="text-xs text-destructive">3-30 characters: letters, numbers, underscore, hyphen</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-foreground/80">
              <Mail className="h-4 w-4" /> Email Address
            </label>
            <div className="relative">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                className={`pr-10 ${emailValid === true ? "border-success" : emailValid === false ? "border-destructive" : ""}`}
                disabled={isLoading}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {isValidatingEmail ? (
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                ) : emailValid === true ? (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                ) : emailValid === false ? (
                  <XCircle className="h-5 w-5 text-destructive" />
                ) : null}
              </div>
            </div>
            {emailError && (
              <p className="flex items-center gap-1 text-xs text-destructive">
                <XCircle className="h-3 w-3" /> {emailError}
              </p>
            )}
            {emailValid && (
              <p className="flex items-center gap-1 text-xs text-success">
                <CheckCircle2 className="h-3 w-3" /> Email verified
              </p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-foreground/80">
              <Lock className="h-4 w-4" /> Password
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {password && (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                    <div className={`h-full transition-all duration-300 ${strengthColor}`} style={{ width: strengthWidth }} />
                  </div>
                  <span className={`text-xs font-medium capitalize ${strengthText}`}>{passwordStrength}</span>
                </div>
                <p className="text-xs text-muted-foreground">Use 8+ chars with upper, lower, numbers &amp; symbols</p>
              </div>
            )}
          </div>

          <Button
            type="submit"
            disabled={isLoading || emailValid === false || usernameValid === false}
            className="h-12 w-full bg-gradient-primary font-semibold text-primary-foreground shadow-glow"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Creating Account...
              </>
            ) : (
              "Create Account"
            )}
          </Button>
        </form>

        <div className="border-t border-border/50 pt-4 text-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-primary hover:underline">
              Sign In
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          By creating an account, you agree to our{" "}
          <Link to="/terms-and-conditions" className="text-primary hover:underline">Terms of Service</Link> and{" "}
          <Link to="/privacy-policy" className="text-primary hover:underline">Privacy Policy</Link>
        </p>
      </div>
    </AuthShell>
  );
}
