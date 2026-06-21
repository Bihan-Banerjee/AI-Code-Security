import { useState } from "react";
import api from "@/lib/api";
import { setAuth } from "@/lib/auth";
import { getErrorMessage } from "@/lib/errors";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { toast } from "sonner";
import AuthShell from "@/components/layout/AuthShell";
import { Eye, EyeOff, LogIn, User, Lock, Loader2 } from "lucide-react";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from || "/dashboard";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error("Please fill in all fields");
      return;
    }
    setIsLoading(true);
    try {
      const res = await api.post("/api/login", { username, password });
      setAuth(res.data.token, username);
      toast.success("Login successful!");
      navigate(from);
    } catch (err) {
      toast.error(getErrorMessage(err, "Login failed"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell>
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-primary shadow-glow">
          <LogIn className="h-8 w-8 text-primary-foreground" />
        </div>
        <h1 className="font-display text-3xl font-bold">Welcome back</h1>
        <p className="mt-1 text-muted-foreground">Sign in to access your secure dashboard</p>
      </div>

      <div className="glass-strong space-y-6 rounded-2xl p-8">
        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-foreground/80">
              <User className="h-4 w-4" /> Username
            </label>
            <Input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className="h-12"
              disabled={isLoading}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-foreground/80">
              <Lock className="h-4 w-4" /> Password
            </label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
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
          </div>

          <div className="flex justify-end">
            <Link to="/forgot-password" className="text-sm font-medium text-primary hover:underline">
              Forgot password?
            </Link>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="h-12 w-full bg-gradient-primary font-semibold text-primary-foreground shadow-glow transition-shadow hover:shadow-glow-accent"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Signing in...
              </>
            ) : (
              <>
                <LogIn className="mr-2 h-5 w-5" /> Sign In
              </>
            )}
          </Button>
        </form>

        <div className="border-t border-border/50 pt-4 text-center">
          <p className="text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/register" className="font-semibold text-primary hover:underline">
              Create Account
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          By signing in, you agree to our{" "}
          <Link to="/terms-and-conditions" className="text-primary hover:underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link to="/privacy-policy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
