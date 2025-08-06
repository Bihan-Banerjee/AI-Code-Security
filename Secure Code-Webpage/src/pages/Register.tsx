import { useState } from "react";
import axios from "axios";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Register() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleRegister = async () => {
    try {
      const res = await axios.post("/api/register", { username, password });
      setMessage(res.data.message);
    } catch (err: any) {
      setMessage(err.response?.data?.error || "Registration failed");
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold">📝 Register</h1>
      <Input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
      <Input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <Button onClick={handleRegister}>Register</Button>
      {message && <p>{message}</p>}
    </div>
  );
}
