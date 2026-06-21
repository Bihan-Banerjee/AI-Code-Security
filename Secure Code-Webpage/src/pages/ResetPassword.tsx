import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { toast } from "sonner";
import AuthShell from "@/components/layout/AuthShell";
import { getErrorMessage } from "@/lib/errors";
import { Lock, Eye, EyeOff, CheckCircle2, Loader2, XCircle, AlertCircle } from "lucide-react";

type Strength = "weak" | "medium" | "strong" | null;

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
  const [passwordStrength, setPasswordStrength] = useState<Strength>(null);

  useEffect(() => {
    const tokenParam = searchParams.get("token");
    if (!tokenParam) {
      toast.error("Invalid reset link");
      navigate("/login");
      return;
    }
    setToken(tokenParam);
    (async () => {
      setIsVerifying(true);
      try {
        const res = await api.post("/api/verify-reset-token", { token: tokenParam });
        if (res.data.valid) setTokenValid(true);
        else {
          toast.error(res.data.error || "Invalid or expired reset link");
          setTimeout(() => navigate("/forgot-password"), 2000);
        }
      } catch {
        toast.error("Invalid or expired reset link");
        setTimeout(() => navigate("/forgot-password"), 2000);
      } finally {
        setIsVerifying(false);
      }
    })();
  }, [searchParams, navigate]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !confirmPassword) return toast.error("Please fill in all fields");
    if (password.length < 8) return toast.error("Password must be at least 8 characters");
    if (password !== confirmPassword) return toast.error("Passwords do not match");
    setIsLoading(true);
    try {
      await api.post("/api/reset-password", { token, password });
      toast.success("Password reset successfully! Please login.");
      navigate("/login");
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to reset password"));
    } finally {
      setIsLoading(false);
    }
  };

  const strengthColor = passwordStrength === "weak" ? "bg-destructive" : passwordStrength === "medium" ? "bg-warning" : "bg-success";
  const strengthWidth = passwordStrength === "weak" ? "33%" : passwordStrength === "medium" ? "66%" : passwordStrength === "strong" ? "100%" : "0%";
  const strengthText = passwordStrength === "weak" ? "text-destructive" : passwordStrength === "medium" ? "text-warning" : "text-success";

  if (isVerifying) {
    return (
      <AuthShell>
        <div className="glass-strong rounded-2xl p-10 text-center">
          <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Verifying reset link...</p>
        </div>
      </AuthShell>
    );
  }

  if (!tokenValid) {
    return (
      <AuthShell>
        <div className="glass-strong rounded-2xl p-8 text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-destructive/15">
            <XCircle className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="font-display text-2xl font-bold">Invalid reset link</h2>
          <p className="mt-2 text-muted-foreground">This password reset link is invalid or has expired.</p>
          <Link to="/forgot-password" className="mt-6 block">
            <Button className="w-full bg-gradient-primary text-primary-foreground">Request new reset link</Button>
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-primary shadow-glow">
          <Lock className="h-8 w-8 text-primary-foreground" />
        </div>
        <h1 className="font-display text-3xl font-bold">Reset your password</h1>
        <p className="mt-1 text-muted-foreground">Enter your new password below</p>
      </div>

      <div className="glass-strong space-y-6 rounded-2xl p-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-foreground/80">
              <Lock className="h-4 w-4" /> New Password
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

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-foreground/80">
              <Lock className="h-4 w-4" /> Confirm Password
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {confirmPassword && (
              <p className={`flex items-center gap-1 text-xs ${password === confirmPassword ? "text-success" : "text-destructive"}`}>
                {password === confirmPassword ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                {password === confirmPassword ? "Passwords match" : "Passwords do not match"}
              </p>
            )}
          </div>

          <div className="flex gap-3 rounded-xl border border-primary/20 bg-primary/10 p-4 text-sm">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-primary" />
            <div className="text-foreground/80">
              <p className="mb-1 font-semibold text-foreground">Security tips</p>
              <ul className="space-y-1 text-xs text-foreground/70">
                <li>• Use a unique password you haven't used before</li>
                <li>• Mix uppercase, lowercase, numbers, and symbols</li>
              </ul>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading || password !== confirmPassword || !password}
            className="h-12 w-full bg-gradient-primary font-semibold text-primary-foreground shadow-glow"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Resetting...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-5 w-5" /> Reset Password
              </>
            )}
          </Button>
        </form>

        <div className="border-t border-border/50 pt-4 text-center">
          <p className="text-sm text-muted-foreground">
            Remember your password?{" "}
            <Link to="/login" className="font-semibold text-primary hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </AuthShell>
  );
}
