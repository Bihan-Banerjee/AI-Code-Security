import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";

export default function LogoutButton() {
  const navigate = useNavigate();

  const handleLogout = () => {
    const token = sessionStorage.getItem("token");

    if (!token) {
      toast.error("You are not logged in!");
      return;
    }

    sessionStorage.removeItem("token");
    sessionStorage.removeItem("username");
    toast.success("✅ Logged out successfully");
    navigate("/login");
  };

  return <Button onClick={handleLogout}>Logout</Button>;
}
