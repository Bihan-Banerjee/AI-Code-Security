import { useState } from "react";
import api from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import AuthShell from "@/components/layout/AuthShell";
import { getErrorMessage } from "@/lib/errors";
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
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }
    setIsLoading(true);
    try {
      await api.post("/api/forgot-password", { email: email.toLowerCase() });
      toast.success("Check your email for reset instructions");
      setEmailSent(true);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to send reset email"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell>
      <Link
        to="/login"
        className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Login
      </Link>

      {!emailSent ? (
        <>
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-primary shadow-glow">
              <Mail className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="font-display text-3xl font-bold">Forgot password?</h1>
            <p className="mt-1 text-muted-foreground">
              No worries — enter your email and we'll send reset instructions.
            </p>
          </div>

          <div className="glass-strong space-y-6 rounded-2xl p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-foreground/80">
                  <Mail className="h-4 w-4" /> Email Address
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

              <div className="flex gap-3 rounded-xl border border-primary/20 bg-primary/10 p-4 text-sm">
                <AlertCircle className="h-5 w-5 flex-shrink-0 text-primary" />
                <div className="text-foreground/80">
                  <p className="mb-1 font-semibold text-foreground">Security notice</p>
                  We'll send a reset link to your registered email. It expires in 1 hour.
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="h-12 w-full bg-gradient-primary font-semibold text-primary-foreground shadow-glow"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Sending...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-5 w-5" /> Send Reset Link
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
        </>
      ) : (
        <div className="glass-strong space-y-6 rounded-2xl p-8 text-center">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-success/15">
            <CheckCircle2 className="h-10 w-10 text-success" />
          </div>
          <div className="space-y-2">
            <h2 className="font-display text-2xl font-bold">Check your email</h2>
            <p className="text-muted-foreground">We've sent reset instructions to:</p>
            <p className="text-lg font-semibold text-primary">{email}</p>
          </div>
          <div className="rounded-xl border border-warning/30 bg-warning/10 p-4 text-left">
            <p className="mb-2 text-sm font-medium text-warning">📬 Didn't receive it?</p>
            <ul className="ml-4 list-disc space-y-1 text-xs text-foreground/70">
              <li>Check your spam or junk folder</li>
              <li>Make sure the email is correct</li>
              <li>Wait a few minutes for delivery</li>
            </ul>
          </div>
          <div className="space-y-3 pt-2">
            <Button
              onClick={() => {
                setEmailSent(false);
                setEmail("");
              }}
              variant="outline"
              className="h-12 w-full"
            >
              Try another email
            </Button>
            <Link to="/login">
              <Button variant="ghost" className="h-12 w-full">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Login
              </Button>
            </Link>
          </div>
        </div>
      )}
    </AuthShell>
  );
}
