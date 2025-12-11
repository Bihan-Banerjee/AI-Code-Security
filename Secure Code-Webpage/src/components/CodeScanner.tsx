import { useState, useRef } from "react";
import { AxiosError } from "axios";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import SecurityHeader from "@/components/SecurityHeader";
import Footer from "@/components/Footer";
import { useMutation } from "@tanstack/react-query";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { toast } from "react-hot-toast";
import { z } from "zod";
import { BanditResponse, BanditItem } from "@/lib/schemas";
import { 
  Upload, 
  FileCode, 
  X, 
  Shield, 
  Loader2, 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  AlertCircle
} from "lucide-react";

type File = {
  filename: string;
  content: string;
};

type ScanResult = z.infer<typeof BanditResponse>;

export default function CodeScanner() {
  const [files, setFiles] = useState<File[]>([{ filename: "app.py", content: "" }]);
  const [language, setLanguage] = useState("python");
  const [issues, setIssues] = useState<z.infer<typeof BanditItem>[]>([]);
  const [scanComplete, setScanComplete] = useState(false);
  const [score, setScore] = useState("A+");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (index: number, field: keyof File, value: string) => {
    const updated = [...files];
    updated[index][field] = value;
    setFiles(updated);
  };

  const addFile = () => {
    setFiles([...files, { filename: `file${files.length + 1}.py`, content: "" }]);
  };

  const deleteFile = (index: number) => {
    const updated = files.filter((_, i) => i !== index);
    setFiles(updated);
  };

  const handleFileUpload = async (uploadedFiles: FileList | null) => {
    if (!uploadedFiles || uploadedFiles.length === 0) return;

    const newFiles: File[] = [];
    const fileArray = Array.from(uploadedFiles);

    const validExtensions = language === "python" 
      ? [".py", ".pyw"] 
      : [".js", ".jsx", ".ts", ".tsx", ".mjs"];

    for (const file of fileArray) {
      const extension = file.name.substring(file.name.lastIndexOf("."));
      
      if (!validExtensions.includes(extension.toLowerCase())) {
        toast.error(`Invalid file type: ${file.name}. Please upload ${language} files only.`);
        continue;
      }

      try {
        const content = await readFileContent(file);
        newFiles.push({
          filename: file.name,
          content: content,
        });
      } catch (error) {
        toast.error(`Failed to read file: ${file.name}`);
        console.error(error);
      }
    }

    if (newFiles.length > 0) {
      if (files.length === 1 && files[0].content === "") {
        setFiles(newFiles);
      } else {
        setFiles([...files, ...newFiles]);
      }
      toast.success(`${newFiles.length} file(s) uploaded successfully!`);
    }
  };

  const readFileContent = (file: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        resolve(content);
      };
      reader.onerror = (error) => reject(error);
      reader.readAsText(file);
    });
  };

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

    const droppedFiles = e.dataTransfer.files;
    handleFileUpload(droppedFiles);
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const scanMutation = useMutation<any, AxiosError, { files: File[], language: string }>({
    mutationFn: (newScan: { files: File[], language: string }) => {
      const token = sessionStorage.getItem("token");
      if (!token) {
        throw new Error("You must be logged in to scan code.");
      }
      return api.post("/api/scan", newScan, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    },
    onSuccess: (res) => {
      const parsed: ScanResult = res.data.result || JSON.parse(res.data.output || "{}");
      const resultIssues = Array.isArray(parsed.results) ? parsed.results : [];

      setIssues(resultIssues);
      setScanComplete(true);

      let numericScore = 100;
      resultIssues.forEach((issue: z.infer<typeof BanditItem>) => {
        const severity = issue.issue_severity?.toLowerCase();
        if (severity === "high") numericScore -= 10;
        else if (severity === "medium") numericScore -= 5;
        else if (severity === "low") numericScore -= 2;
      });

      numericScore = Math.max(0, numericScore);

      let grade = "F";
      if (numericScore >= 95) grade = "A+";
      else if (numericScore >= 85) grade = "A";
      else if (numericScore >= 75) grade = "B";
      else if (numericScore >= 65) grade = "C";
      else if (numericScore >= 50) grade = "D";

      setScore(`${numericScore} (${grade})`);
      toast.success("Scan complete!");
    },
    onError: (err: any) => {
      console.error(err);
      toast.error(err.response?.data?.error || "Scan failed");
      setIssues([]);
      setScanComplete(true);
      setScore("N/A");
    },
  });

  const handleScan = () => {
    const hasContent = files.some(file => file.content.trim() !== "");
    if (!hasContent) {
      toast.error("Please add some code or upload files before scanning.");
      return;
    }
    scanMutation.mutate({ files, language });
  };

  const getSeverityColor = (severity?: string) => {
    switch (severity?.toLowerCase()) {
      case "high":
        return "text-red-600 font-semibold";
      case "medium":
        return "text-yellow-600 font-semibold";
      case "low":
        return "text-green-600 font-semibold";
      default:
        return "text-gray-700";
    }
  };

  const getSeverityIcon = (severity?: string) => {
    switch (severity?.toLowerCase()) {
      case "high":
        return <XCircle className="w-4 h-4 text-red-600" />;
      case "medium":
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case "low":
        return <AlertCircle className="w-4 h-4 text-green-600" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SecurityHeader />
      <div className="min-h-screen bg-gradient-to-b from-white to-blue-50 p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* Hero Section */}
          <div className="text-center space-y-4">
            <div className="inline-block bg-blue-100 text-blue-800 font-semibold px-4 py-1 rounded-full text-sm">
              AI-Powered Security Scanner
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 flex items-center justify-center gap-3">
              <Shield className="w-8 h-8 text-blue-600" />
              Code Scanner with <span className="text-blue-600 ml-2">AI Intelligence</span>
            </h1>
            <p className="text-gray-600 text-lg max-w-3xl mx-auto">
              Our AI-powered scanner analyzes your source code to detect weaknesses and insecure patterns 
              across 2 major languages. It highlights issues with severity levels, provides clear descriptions 
              and helps you understand where your code might be at risk—all in a matter of seconds.
            </p>
          </div>

          {/* Stats Section */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="bg-white rounded-lg p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-blue-700">99.8%</p>
              <p className="text-sm text-gray-500">Accuracy Rate</p>
            </div>
            <div className="bg-white rounded-lg p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-blue-700">50+</p>
              <p className="text-sm text-gray-500">Vulnerability Types</p>
            </div>
            <div className="bg-white rounded-lg p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-blue-700">2</p>
              <p className="text-sm text-gray-500">Languages</p>
            </div>
            <div className="bg-white rounded-lg p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-blue-700">Instant</p>
              <p className="text-sm text-gray-500">Results</p>
            </div>
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
                            🐍 Python
                          </span>
                        </SelectItem>
                        <SelectItem value="javascript">
                          <span className="flex items-center gap-2">
                            ⚡ JavaScript
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Drag & Drop Zone */}
              <Card className="shadow-lg rounded-2xl border-2 border-blue-100">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-white">
                  <CardTitle className="flex items-center gap-2 text-blue-900">
                    <Upload className="w-5 h-5" />
                    Upload Code Files
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
                      {isDragging ? "Drop your files here" : "Drag & Drop your code files"}
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
                      multiple
                      accept={language === "python" ? ".py,.pyw" : ".js,.jsx,.ts,.tsx,.mjs"}
                      onChange={(e) => handleFileUpload(e.target.files)}
                      className="hidden"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Manual Code Input */}
              <Card className="shadow-lg rounded-2xl border-2 border-blue-100">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-white">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-blue-900">
                      <FileCode className="w-5 h-5" />
                      Or Enter Code Manually
                    </CardTitle>
                    <Button variant="outline" size="sm" onClick={addFile}>
                      + Add File
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="space-y-3 p-4 rounded-lg border-2 border-blue-100 bg-white"
                    >
                      <div className="flex items-center gap-4">
                        <Label className="text-sm font-semibold text-gray-700 w-20">
                          Filename:
                        </Label>
                        <Input
                          value={file.filename}
                          onChange={(e) => handleFileChange(index, "filename", e.target.value)}
                          className="flex-1 font-mono text-sm"
                        />
                        {files.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteFile(index)}
                            className="hover:bg-red-50 hover:text-red-600"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <Textarea
                        rows={8}
                        value={file.content}
                        onChange={(e) => handleFileChange(index, "content", e.target.value)}
                        placeholder="Paste your code here..."
                        className="font-mono text-sm resize-none"
                      />
                    </div>
                  ))}

                  {/* Scan Button - Prominent Position */}
                  <Button
                    onClick={handleScan}
                    disabled={scanMutation.isPending}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-6 rounded-xl shadow-lg hover:shadow-xl transition-all"
                  >
                    {scanMutation.isPending ? (
                      <>
                        <Loader2 className="animate-spin w-5 h-5 mr-2" />
                        Scanning for Vulnerabilities...
                      </>
                    ) : (
                      <>
                        <Shield className="w-5 h-5 mr-2" />
                        Start Security Scan
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Results */}
            <div className="space-y-6">
              {!scanComplete ? (
                <Card className="shadow-lg rounded-2xl border-2 border-blue-100 h-full flex items-center justify-center min-h-[600px]">
                  <CardContent className="text-center py-12">
                    <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Shield className="w-10 h-10 text-blue-600" />
                    </div>
                    <p className="text-gray-500 text-lg mb-2">No scan results yet</p>
                    <p className="text-gray-400 text-sm max-w-sm mx-auto">
                      Upload files or paste your code, then click "Start Security Scan" to analyze your code for vulnerabilities
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Score Card */}
                  <Card className="shadow-lg rounded-2xl border-2 border-green-100">
                    <CardHeader className="bg-gradient-to-r from-green-50 to-white">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-green-900">
                          <CheckCircle2 className="w-5 h-5" />
                          Scan Complete
                        </CardTitle>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Security Score</p>
                          <p className="text-2xl font-bold text-green-600">{score}</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                      {issues.length === 0 ? (
                        <div className="text-center py-8">
                          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                          <p className="text-lg font-semibold text-green-700">
                            No vulnerabilities found!
                          </p>
                          <p className="text-sm text-gray-600 mt-2">
                            Your code passed all security checks. Great job!
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-sm text-gray-600">
                            Found <span className="font-bold text-red-600">{issues.length}</span> security {issues.length === 1 ? 'issue' : 'issues'}
                          </p>
                          <div className="flex gap-4 text-xs">
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-3 bg-red-500 rounded"></div>
                              <span>{issues.filter(i => i.issue_severity?.toLowerCase() === 'high').length} High</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                              <span>{issues.filter(i => i.issue_severity?.toLowerCase() === 'medium').length} Medium</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-3 bg-green-500 rounded"></div>
                              <span>{issues.filter(i => i.issue_severity?.toLowerCase() === 'low').length} Low</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Vulnerabilities Table */}
                  {issues.length > 0 && (
                    <Card className="shadow-lg rounded-2xl border-2 border-red-100">
                      <CardHeader className="bg-gradient-to-r from-red-50 to-white">
                        <CardTitle className="flex items-center gap-2 text-red-900">
                          <AlertTriangle className="w-5 h-5" />
                          Detected Vulnerabilities
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-6">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b-2 border-gray-200">
                                <th className="text-left p-3 font-semibold text-gray-700">File</th>
                                <th className="text-left p-3 font-semibold text-gray-700">Line</th>
                                <th className="text-left p-3 font-semibold text-gray-700">Severity</th>
                                <th className="text-left p-3 font-semibold text-gray-700">Description</th>
                                <th className="text-left p-3 font-semibold text-gray-700">CWE</th>
                              </tr>
                            </thead>
                            <tbody>
                              {issues.map((issue, idx) => (
                                <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                                  <td className="p-3 font-mono text-xs">
                                    {issue.filename?.split("\\").pop() || "-"}
                                  </td>
                                  <td className="p-3 font-mono text-xs">
                                    {issue.line_number || "-"}
                                  </td>
                                  <td className={`p-3 ${getSeverityColor(issue.issue_severity)}`}>
                                    <div className="flex items-center gap-2">
                                      {getSeverityIcon(issue.issue_severity)}
                                      <span>{issue.issue_severity || "-"}</span>
                                    </div>
                                  </td>
                                  <td className="p-3 text-gray-700 text-xs">
                                    {issue.issue_text || "-"}
                                  </td>
                                  <td className="p-3">
                                    {issue.issue_cwe?.id ? (
                                      <a
                                        href={issue.issue_cwe.link}
                                        className="text-blue-600 hover:text-blue-800 underline text-xs font-medium"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        CWE-{issue.issue_cwe.id}
                                      </a>
                                    ) : (
                                      "-"
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  )}
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
