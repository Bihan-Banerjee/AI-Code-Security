import { useState } from "react";
import axios from "axios";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "react-hot-toast";
import { Loader2, Sparkles } from "lucide-react";
import SecurityHeader from "@/components/SecurityHeader";
import Footer from "@/components/Footer";


export default function Enhancer() {
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("python");
  const [result, setResult] = useState<{ enhanced: string; diff: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleEnhance = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("You must be logged in to enhance code!");
        return;
      }

      setLoading(true);

      const res = await axios.post(
        "/api/enhance",
        { code, language },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setResult({ enhanced: res.data.enhanced_code, diff: res.data.diff });
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
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="shadow-lg rounded-2xl">
            <CardHeader>
              <CardTitle>Enhanced Code</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea value={result.enhanced} readOnly rows={12} />
            </CardContent>
          </Card>

          <Card className="shadow-lg rounded-2xl">
            <CardHeader>
              <CardTitle>Diff</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea value={result.diff} readOnly rows={12} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
 <Footer />
    </div>
  );
}
