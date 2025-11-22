import { useState } from "react";
import api from "@/lib/api";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "react-hot-toast";
import { Loader2, Sparkles } from "lucide-react";
import SecurityHeader from "@/components/SecurityHeader";
import Footer from "@/components/Footer";

type DiffLine = { type: "add" | "remove" | "context"; content: string };
interface EnhanceResult {
  enhanced: string;  
  diff: DiffLine[];
  candidates: Candidate[];
  explanations: Explanation[];
}

interface Candidate {
  model: string;
  code: string;
}

interface Explanation {
  change: string;
  reason: string;
}

export default function Enhancer() {
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("python");
  const [result, setResult] = useState<EnhanceResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleEnhance = async () => {
    try {
      const token = sessionStorage.getItem("token");
      if (!token) {
        toast.error("You must be logged in to enhance code!");
        return;
      }

      setLoading(true);

      const res = await api.post(
        "/api/enhance",
        { code, language },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setResult({
        enhanced: res.data.enhanced_code,
        diff: res.data.diff,
        candidates: res.data.candidates || [],
        explanations: res.data.explanations || [],
      });

      toast.success("Code enhanced successfully!");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Enhancement failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SecurityHeader />
      <div className="p-8 max-w-5xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          AI Code Enhancer
        </h1>
        <p className="text-gray-600">
          Paste your insecure code, choose the language, and let AI enhance it with improved security and clarity.
        </p>

        {/* Input Card */}
        <Card className="shadow-lg rounded-2xl">
          <CardHeader>
            <CardTitle>Enhance Your Code</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Programming Language</Label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500"
              >
                <option value="python">Python</option>
                <option value="javascript">JavaScript</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>Your Code</Label>
              <Textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Paste your insecure code here..."
                rows={10}
              />
            </div>

            <Button
              onClick={handleEnhance}
              disabled={loading || !code.trim()}
              className="flex items-center gap-2 w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin w-4 h-4" />
                  Enhancing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Enhance Code
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Explanations */}
            <Card className="shadow-lg rounded-2xl">
              <CardHeader><CardTitle>Why These Changes?</CardTitle></CardHeader>
              <CardContent>
                <ul className="list-disc pl-6 space-y-1 text-sm text-gray-700">
                  {result.explanations?.map((ex, i) => (
                    <li key={i}><strong>{ex.change}:</strong> {ex.reason}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
                
            {/* Candidate Tabs */}
            <div className="grid md:grid-cols-3 gap-6">
              {result.candidates?.map((c, i) => (
              <Card key={i} className="shadow-lg rounded-2xl">
                <CardHeader>
                  <CardTitle>{c.model}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea value={c.code} readOnly rows={12} />
                </CardContent>
              </Card>
            ))}
            </div>
            
            {/* Final Diff */}
            <Card className="shadow-lg rounded-2xl">
              <CardHeader><CardTitle>Final Chosen Diff</CardTitle></CardHeader>
              <CardContent>
                <div className="font-mono text-sm border rounded-md overflow-hidden">
                  {result.diff.map((line, i) => (
                    <pre key={i}
                      className={line.type === "add" ? "bg-green-100 text-green-800 px-2"
                        : line.type === "remove" ? "bg-red-100 text-red-800 px-2"
                        : "px-2 text-gray-700"}>
                      {line.type === "add" ? "+" : line.type === "remove" ? "-" : " "}
                      {line.content}
                    </pre>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

      </div>
      <Footer />
    </div>
  );
}
