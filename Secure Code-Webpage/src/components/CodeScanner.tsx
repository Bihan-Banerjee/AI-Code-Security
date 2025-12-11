import { useState, useRef } from "react";
import { AxiosError } from "axios";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
import { Upload, File as FileIcon, X } from "lucide-react"; 

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

  return (
    <div className="min-h-screen bg-background">
      <SecurityHeader />
      <div className="min-h-screen bg-gradient-to-b from-white to-blue-50 p-8">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-12 items-start">
          {/* Left Section */}
          <div className="flex-1 space-y-6">
            <div className="inline-block bg-blue-100 text-blue-800 font-semibold px-4 py-1 rounded-full text-sm">
              AI-Powered Security Scanner
            </div>
            <h1 className="text-4xl font-bold text-gray-900">
              Code Scanner with <span className="text-blue-600">AI Intelligence</span>!
            </h1>
            <p className="text-gray-600 text-lg">
              Our AI-powered scanner analyzes your source code to detect weaknesses and insecure patterns across 2 Major Languages, Python and Javascript. It highlights issues with severity levels, provides clear descriptions and helps you understand where your code might be at risk all in a matter of seconds. No setup required, just paste your code and get instant feedback.
            </p>
            <div className="flex gap-4">
              <Button onClick={handleScan} disabled={scanMutation.isPending}>
                {scanMutation.isPending ? "Scanning..." : "Start Security Scan"}
              </Button>
            </div>

            <div className="flex gap-8 pt-6">
              <div>
                <p className="text-2xl font-bold text-blue-700">99.8%</p>
                <p className="text-sm text-gray-500">Accuracy Rate</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-700">50+</p>
                <p className="text-sm text-gray-500">Vulnerability Types</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-700">100%</p>
                <p className="text-sm text-gray-500">Happy Users</p>
              </div>
            </div>

            <div className="pt-6">
              <Select onValueChange={setLanguage} defaultValue="python">
                <SelectTrigger className="w-60">
                  <SelectValue placeholder="Language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="python">Python</SelectItem>
                  <SelectItem value="javascript">JavaScript</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Drag and Drop Zone */}
            <div
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-300 bg-white hover:border-blue-400"
              }`}
            >
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-lg font-medium text-gray-700 mb-2">
                Drag & Drop files here
              </p>
              <p className="text-sm text-gray-500 mb-4">or</p>
              <Button variant="outline" onClick={handleBrowseClick}>
                <FileIcon className="mr-2 h-4 w-4" />
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

            {/* Manual Code Input */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">
                  Or Enter Code Manually
                </h3>
                <Button variant="outline" size="sm" onClick={addFile}>
                  + Add File
                </Button>
              </div>

              {files.map((file, index) => (
                <div
                  key={index}
                  className="space-y-2 border border-blue-200 bg-white p-4 rounded-lg shadow-sm"
                >
                  <div className="flex items-center gap-4">
                    <Label className="w-20">Filename:</Label>
                    <Input
                      value={file.filename}
                      onChange={(e) => handleFileChange(index, "filename", e.target.value)}
                      className="flex-1"
                    />
                    {files.length > 1 && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteFile(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <Textarea
                    rows={6}
                    value={file.content}
                    onChange={(e) => handleFileChange(index, "content", e.target.value)}
                    placeholder="Paste your code here..."
                    className="font-mono text-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Right Section - Results */}
          <div className="flex-1 bg-white rounded-xl shadow-lg p-6 w-full">
            <div className="flex items-center justify-between border-b pb-4">
              <p className="text-lg font-medium">Scan Results</p>
              <p className="text-green-600 font-bold">Security Score: {score}</p>
            </div>

            {scanComplete && issues && issues.length > 0 ? (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm border border-gray-300">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-2 border">File</th>
                      <th className="p-2 border">Line</th>
                      <th className="p-2 border">Severity</th>
                      <th className="p-2 border">Description</th>
                      <th className="p-2 border">CWE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {issues.map((issue, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="p-2 border">{issue.filename?.split("\\").pop() || "-"}</td>
                        <td className="p-2 border">{issue.line_number || "-"}</td>
                        <td className={`p-2 border ${getSeverityColor(issue.issue_severity)}`}>
                          {issue.issue_severity || "-"}
                        </td>
                        <td className="p-2 border">{issue.issue_text || "-"}</td>
                        <td className="p-2 border">
                          {issue.issue_cwe?.id ? (
                            <a
                              href={issue.issue_cwe.link}
                              className="text-blue-600 underline"
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
            ) : scanComplete ? (
              <p className="mt-4 text-green-700">No vulnerabilities found. Your code is secure!</p>
            ) : (
              <p className="mt-4 text-gray-500">Run a scan to see results here.</p>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
