import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { LogOut } from "lucide-react";

const LogoutButton = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Clear authentication data
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("username");
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    
    toast.success("Logged out successfully!");
    navigate("/login");
  };

  return (
    <Button 
      onClick={handleLogout}
      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105"
    >
      <LogOut className="w-4 h-4 mr-2" />
      Logout
    </Button>
  );
};

export default LogoutButton;
