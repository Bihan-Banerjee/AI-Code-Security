import { useState } from "react";
import axios from "axios";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";

export default function Enhancer() {
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("python");
  const [result, setResult] = useState<{ enhanced: string; diff: string } | null>(null);

  const handleEnhance = async () => {
    try {
      const res = await axios.post("/api/enhance", { code, language });
      setResult({ enhanced: res.data.enhanced_code, diff: res.data.diff });
      toast.success("Code enhanced successfully!");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Enhancement failed");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">💡 AI Code Enhancer</h1>

      <select value={language} onChange={(e) => setLanguage(e.target.value)}>
        <option value="python">Python</option>
        <option value="javascript">JavaScript</option>
      </select>

      <Textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Paste your insecure code here..."
        rows={10}
      />
      <Button onClick={handleEnhance}>✨ Enhance</Button>

      {result && (
        <div className="space-y-4 mt-6">
          <h2 className="text-xl font-semibold">✅ Enhanced Code</h2>
          <Textarea value={result.enhanced} readOnly rows={10} />
          <h2 className="text-xl font-semibold">🧠 Diff</h2>
          <Textarea value={result.diff} readOnly rows={10} />
        </div>
      )}
    </div>
  );
}
