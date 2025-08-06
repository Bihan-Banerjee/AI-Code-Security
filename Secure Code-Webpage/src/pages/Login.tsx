import { useState } from "react";
import axios from "axios";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleLogin = async () => {
    try {
      const res = await axios.post("/api/login", { username, password });
      localStorage.setItem("token", res.data.token);
      setMessage("Login successful!");
      
      // optionally redirect
      // window.location.href = "/dashboard";
    } catch (err: any) {
      setMessage(err.response?.data?.error || "Login failed");
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold">🔐 Login</h1>

      <Input
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />

      <Input
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <Button onClick={handleLogin}>Login</Button>

      {message && <p>{message}</p>}
    </div>
  );
}
