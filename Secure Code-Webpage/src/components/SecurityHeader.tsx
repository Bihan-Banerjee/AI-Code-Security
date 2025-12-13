import { Button } from "@/components/ui/button";
import { FaUser } from "react-icons/fa";
import LogoutButton from "./logoutButton";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const SecurityHeader = () => {
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = sessionStorage.getItem("username");
    if (storedUser) {
      setUsername(storedUser);
    }
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo with PNG */}
          <Link to="/" className="flex items-center gap-0 group">
            <img 
              src="/logo.png" 
              alt="FortiScan Logo" 
              className="w-15 h-12 group-hover:scale-110 transition-transform duration-300 drop-shadow-lg"
            />
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                FortiScan
              </h1>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-6 ml-8">
            <Link 
              to="/scanner" 
              className="text-sm font-semibold text-gray-700 hover:text-blue-600 transition-colors"
            >
              Scanner
            </Link>
            <Link 
              to="/enhancer" 
              className="text-sm font-semibold text-gray-700 hover:text-blue-600 transition-colors"
            >
              AI Enhancer
            </Link>
            <Link 
              to="/dashboard" 
              className="text-sm font-semibold text-gray-700 hover:text-blue-600 transition-colors"
            >
              Dashboard
            </Link>
            <Link 
              to="/about" 
              className="text-sm font-semibold text-gray-700 hover:text-blue-600 transition-colors"
            >
              About Us
            </Link>
            <Link 
              to="/reviews" 
              className="text-sm font-semibold text-gray-700 hover:text-blue-600 transition-colors"
            >
              Reviews
            </Link>
          </nav>

          {/* Auth Section */}
          <div className="flex items-center gap-3 ml-auto">
            {username ? (
              <>
                <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-xl border border-blue-200">
                  <span className="text-sm font-medium text-gray-600">
                    Welcome,{" "}
                    <span className="font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      {username}
                    </span>
                  </span>
                </div>
                <LogoutButton />
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button 
                    variant="ghost" 
                    className="font-semibold hover:bg-blue-50 hover:text-blue-600 transition-colors"
                  >
                    Sign In
                  </Button>
                </Link>
                <Link to="/register">
                  <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold shadow-md transition-all">
                    <FaUser className="w-4 h-4 mr-2" />
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default SecurityHeader;
