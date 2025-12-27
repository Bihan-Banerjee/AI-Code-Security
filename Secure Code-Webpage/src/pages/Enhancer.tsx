import { useState, useRef } from "react";
import api from "@/lib/api";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "react-hot-toast";
import { 
  Loader2, 
  Sparkles, 
  Upload, 
  FileCode, 
  CheckCircle2, 
  AlertCircle,
  Copy,
  Download
} from "lucide-react";
import SecurityHeader from "@/components/SecurityHeader";
import Footer from "@/components/Footer";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

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
  const [filename, setFilename] = useState("code.py");
  const [language, setLanguage] = useState("python");
  const [result, setResult] = useState<EnhanceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File upload handler
  const handleFileUpload = async (uploadedFiles: FileList | null) => {
    if (!uploadedFiles || uploadedFiles.length === 0) return;

    const file = uploadedFiles[0]; // Take only the first file
    const extension = file.name.substring(file.name.lastIndexOf("."));

    // Validate file extension
    const validExtensions = language === "python" 
      ? [".py", ".pyw"] 
      : [".js", ".jsx", ".ts", ".tsx", ".mjs"];

    if (!validExtensions.includes(extension.toLowerCase())) {
      toast.error(`Invalid file type. Please upload ${language} files only.`);
      return;
    }

    try {
      const content = await readFileContent(file);
      setCode(content);
      setFilename(file.name);
      toast.success(`File "${file.name}" loaded successfully!`);
    } catch (error) {
      toast.error("Failed to read file");
      console.error(error);
    }
  };

  // Read file content
  const readFileContent = (file: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleEnhance = async () => {
    if (!code.trim()) {
      toast.error("Please provide some code to enhance!");
      return;
    }

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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const downloadCode = (code: string, filename: string) => {
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("File downloaded!");
  };

  return (
    <div className="min-h-screen bg-background">
      <SecurityHeader />
      <div className="min-h-screen bg-gradient-to-b from-white to-blue-50 p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* Hero Section */}
          <div className="text-center space-y-4">
            <div className="inline-block bg-blue-100 text-blue-800 font-semibold px-4 py-1 rounded-full text-sm">
              AI-Powered Code Enhancement
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 flex items-center justify-center gap-3">
              <Sparkles className="w-8 h-8 text-blue-600" />
              Smart Code Enhancer
            </h1>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Transform your insecure or inefficient code into production-ready, 
              secure implementations with AI-powered suggestions and multi-model validation.
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card className="group border-2 border-blue-200 hover:border-blue-400 hover:shadow-xl hover:-translate-y-2 transition-all duration-300 cursor-pointer">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2 group-hover:scale-110 transition-transform">3+</div>
                <div className="text-sm text-gray-600 font-medium">AI Models</div>
                <div className="h-1 w-0 bg-gradient-to-r from-blue-500 to-purple-500 group-hover:w-full transition-all duration-500 mt-2 rounded-full mx-auto"></div>
              </CardContent>
            </Card>
            
            <Card className="group border-2 border-green-200 hover:border-green-400 hover:shadow-xl hover:-translate-y-2 transition-all duration-300 cursor-pointer">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-green-600 mb-2 group-hover:scale-110 transition-transform">99%</div>
                <div className="text-sm text-gray-600 font-medium">Success Rate</div>
                <div className="h-1 w-0 bg-gradient-to-r from-green-500 to-emerald-500 group-hover:w-full transition-all duration-500 mt-2 rounded-full mx-auto"></div>
              </CardContent>
            </Card>
            
            <Card className="group border-2 border-purple-200 hover:border-purple-400 hover:shadow-xl hover:-translate-y-2 transition-all duration-300 cursor-pointer">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-purple-600 mb-2 group-hover:scale-110 transition-transform">2</div>
                <div className="text-sm text-gray-600 font-medium">Languages</div>
                <div className="h-1 w-0 bg-gradient-to-r from-purple-500 to-pink-500 group-hover:w-full transition-all duration-500 mt-2 rounded-full mx-auto"></div>
              </CardContent>
            </Card>
            
            <Card className="group border-2 border-orange-200 hover:border-orange-400 hover:shadow-xl hover:-translate-y-2 transition-all duration-300 cursor-pointer">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-orange-600 mb-2 group-hover:scale-110 transition-transform">Instant</div>
                <div className="text-sm text-gray-600 font-medium">Results</div>
                <div className="h-1 w-0 bg-gradient-to-r from-orange-500 to-red-500 group-hover:w-full transition-all duration-500 mt-2 rounded-full mx-auto"></div>
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            
            {/* Left Column - Input */}
            <div className="space-y-6">
              
              {/* Language Selection */}
              <Card className="shadow-lg rounded-2xl border-2 border-blue-100">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-white">
                  <CardTitle className="flex items-center gap-2 text-blue-900">
                    <FileCode className="w-5 h-5" />
                    Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700">
                      Programming Language
                    </Label>
                    <Select onValueChange={setLanguage} defaultValue="python">
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="python">
                          <span className="flex items-center gap-2">
                            Python
                          </span>
                        </SelectItem>
                        <SelectItem value="javascript">
                          <span className="flex items-center gap-2">
                            JavaScript
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700">
                      Filename (Optional)
                    </Label>
                    <Input
                      value={filename}
                      onChange={(e) => setFilename(e.target.value)}
                      placeholder="code.py"
                      className="font-mono text-sm"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Drag & Drop Zone */}
              <Card className="shadow-lg rounded-2xl border-2 border-blue-100">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-white">
                  <CardTitle className="flex items-center gap-2 text-blue-900">
                    <Upload className="w-5 h-5" />
                    Upload Code File
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div
                    onDragEnter={handleDragEnter}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                      isDragging
                        ? "border-blue-500 bg-blue-50 scale-105"
                        : "border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50"
                    }`}
                  >
                    <Upload className={`mx-auto h-12 w-12 mb-4 transition-colors ${
                      isDragging ? "text-blue-600" : "text-gray-400"
                    }`} />
                    <p className="text-lg font-medium text-gray-700 mb-2">
                      {isDragging ? "Drop your file here" : "Drag & Drop your code file"}
                    </p>
                    <p className="text-sm text-gray-500 mb-4">or</p>
                    <Button 
                      variant="outline" 
                      onClick={handleBrowseClick}
                      className="border-blue-300 hover:bg-blue-50"
                    >
                      <FileCode className="mr-2 h-4 w-4" />
                      Browse Files
                    </Button>
                    <p className="text-xs text-gray-400 mt-4">
                      Supported: {language === "python" ? ".py, .pyw" : ".js, .jsx, .ts, .tsx, .mjs"}
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={language === "python" ? ".py,.pyw" : ".js,.jsx,.ts,.tsx,.mjs"}
                      onChange={(e) => handleFileUpload(e.target.files)}
                      className="hidden"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Code Input */}
              <Card className="shadow-lg rounded-2xl border-2 border-blue-100">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-white">
                  <CardTitle className="flex items-center gap-2 text-blue-900">
                    <FileCode className="w-5 h-5" />
                    Your Code
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  <Textarea
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Paste your insecure or inefficient code here..."
                    rows={14}
                    className="font-mono text-sm resize-none"
                  />

                  <Button
                    onClick={handleEnhance}
                    disabled={loading || !code.trim()}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-6 rounded-xl shadow-lg hover:shadow-xl transition-all"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="animate-spin w-5 h-5 mr-2" />
                        Enhancing with AI...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 mr-2" />
                        Enhance Code Now
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Results */}
            <div className="space-y-6">
              {!result ? (
                <Card className="shadow-lg rounded-2xl border-2 border-blue-100 h-full flex items-center justify-center min-h-[600px]">
                  <CardContent className="text-center py-12">
                    <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Sparkles className="w-10 h-10 text-blue-600" />
                    </div>
                    <p className="text-gray-500 text-lg mb-2">No results yet</p>
                    <p className="text-gray-400 text-sm max-w-sm mx-auto">
                      Upload a file or paste your code, then click "Enhance Code" to see AI-powered improvements
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Explanations */}
                  <Card className="shadow-lg rounded-2xl border-2 border-green-100">
                    <CardHeader className="bg-gradient-to-r from-green-50 to-white">
                      <CardTitle className="flex items-center gap-2 text-green-900">
                        <CheckCircle2 className="w-5 h-5" />
                        What Changed & Why
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      {result.explanations?.length > 0 ? (
                        <ul className="space-y-3">
                          {result.explanations.map((ex, i) => (
                            <li key={i} className="flex gap-3 items-start">
                              <AlertCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                              <div className="text-sm">
                                <strong className="text-gray-900">{ex.change}:</strong>
                                <p className="text-gray-600 mt-1">{ex.reason}</p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-gray-500 text-sm">No specific explanations provided.</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Candidate Models Tabs */}
                  {result.candidates?.length > 0 && (
                    <Card className="shadow-lg rounded-2xl border-2 border-blue-100">
                      <CardHeader className="bg-gradient-to-r from-blue-50 to-white">
                        <CardTitle className="text-blue-900">
                          AI Model Suggestions
                        </CardTitle>
                        <p className="text-sm text-gray-600 mt-1">
                          Compare outputs from {result.candidates.length} different AI models
                        </p>
                      </CardHeader>
                      <CardContent className="pt-6 space-y-4">
                        {/* Tabs */}
                        <div className="flex gap-2 overflow-x-auto pb-2">
                          {result.candidates.map((c, i) => (
                            <Button
                              key={i}
                              variant={activeTab === i ? "default" : "outline"}
                              size="sm"
                              onClick={() => setActiveTab(i)}
                              className={`flex-shrink-0 ${
                                activeTab === i 
                                  ? "bg-blue-600 text-white" 
                                  : "hover:bg-blue-50"
                              }`}
                            >
                              {c.model}
                            </Button>
                          ))}
                        </div>

                        {/* Active Tab Content */}
                        <div className="relative">
                          <div className="absolute top-2 right-2 flex gap-2 z-10">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copyToClipboard(result.candidates[activeTab].code)}
                              className="bg-white/80 hover:bg-white"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => downloadCode(
                                result.candidates[activeTab].code,
                                `enhanced_${result.candidates[activeTab].model}_${filename}`
                              )}
                              className="bg-white/80 hover:bg-white"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                          <Textarea
                            value={result.candidates[activeTab].code}
                            readOnly
                            rows={14}
                            className="font-mono text-sm resize-none pr-24"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Final Diff */}
                  <Card className="shadow-lg rounded-2xl border-2 border-purple-100">
                    <CardHeader className="bg-gradient-to-r from-purple-50 to-white">
                      <CardTitle className="text-purple-900">
                        Code Changes (Diff View)
                      </CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        Red lines removed • Green lines added
                      </p>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="font-mono text-xs border rounded-lg overflow-hidden bg-gray-50">
                        {result.diff.map((line, i) => (
                          <div
                            key={i}
                            className={`px-4 py-1 ${
                              line.type === "add"
                                ? "bg-green-50 text-green-900 border-l-4 border-green-500"
                                : line.type === "remove"
                                ? "bg-red-50 text-red-900 border-l-4 border-red-500"
                                : "text-gray-700"
                            }`}
                          >
                            <span className="select-none mr-2 text-gray-400">
                              {line.type === "add" ? "+" : line.type === "remove" ? "-" : " "}
                            </span>
                            <span>{line.content}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
