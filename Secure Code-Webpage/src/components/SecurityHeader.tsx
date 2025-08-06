import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FaUser } from "react-icons/fa";
import LogoutButton from "./logoutButton";
import { useEffect, useState } from "react";


const SecurityHeader = () => {
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("username");
    if (storedUser) {
      setUsername(storedUser);
    }
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div className="flex items-center space-x-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-r from-primary to-primary-glow">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-xl">SecureCode AI</span>
        </div>

        <nav className="flex items-center space-x-6 ml-8">
          <a href="scanner" className="text-sm font-medium transition-colors hover:text-primary">
            Scanner
          </a>
          <a href="#dashboard" className="text-sm font-medium transition-colors hover:text-primary">
            Dashboard
          </a>
          <a href="#reports" className="text-sm font-medium transition-colors hover:text-primary">
            About Us
          </a>
          <a href="#reports" className="text-sm font-medium transition-colors hover:text-primary">
            Reviews
          </a>
        </nav>

        <div className="ml-auto flex items-center space-x-4">
          {username ? (
            <>
              <span className="text-sm font-medium text-muted-foreground">
                👋 Welcome, <span className="text-primary font-semibold">{username}</span>
              </span>
              <LogoutButton />
            </>
          ) : (
            <Button variant="security" size="sm" onClick={() => window.location.href = "/login"}>
              <FaUser className="w-4 h-4 mr-2" />
              Login
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default SecurityHeader;
