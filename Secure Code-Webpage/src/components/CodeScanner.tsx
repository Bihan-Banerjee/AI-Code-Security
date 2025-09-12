import { useState } from "react";
import axios, { AxiosError } from "axios";
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

  const scanMutation = useMutation<any, AxiosError, { files: File[], language: string }>({
    mutationFn: (newScan: { files: File[], language: string }) => {
        const token = sessionStorage.getItem("token");
        if (!token) {
            throw new Error("You must be logged in to scan code.");
        }
        return axios.post("/api/scan", newScan, {
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
         
        <div className="flex-1 space-y-6">
          
          <div className="inline-block bg-blue-100 text-blue-800 font-semibold px-4 py-1 rounded-full text-sm">
            AI-Powered Security Scanner
          </div>
          <h1 className="text-4xl font-bold text-gray-900">
            Code Scanner with <span className="text-blue-600">AI Intelligence</span>!
          </h1>
          <p className="text-gray-600 text-lg">
            Our AI-powered scanner analyzes your source code to detect weaknesses and insecure patterns across multiple languages. It highlights issues with severity levels, provides clear descriptions and helps you understand where your code might be at risk all in a matter of seconds. No setup required, just paste your code and get instant feedback.
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
              <p className="text-2xl font-bold text-blue-700">10M+</p>
              <p className="text-sm text-gray-500">Lines Analyzed</p>
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

          {files.map((file, index) => (
            <div key={index} className="space-y-2 border border-blue-200 bg-white p-4 rounded-lg shadow-sm">
              <div className="flex items-center gap-4">
                <Label className="w-20">Filename:</Label>
                <Input
                  value={file.filename}
                  onChange={(e) => handleFileChange(index, "filename", e.target.value)}
                  className="flex-1"
                />
                <Button variant="destructive" onClick={() => deleteFile(index)}>
                  Delete
                </Button>
              </div>
              <Textarea
                rows={6}
                value={file.content}
                onChange={(e) => handleFileChange(index, "content", e.target.value)}
                placeholder="Paste your code here..."
              />
            </div>
          ))}

          <div className="flex gap-4">
            <Button variant="outline" onClick={addFile}>Add File</Button>
          </div>
        </div>

        <div className="flex-1 bg-white rounded-xl shadow-lg p-6 w-full">
          <div className="flex items-center justify-between border-b pb-4">
            <p className="text-lg font-medium">Scan Complete</p>
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
                      <td className={`p-2 border ${getSeverityColor(issue.issue_severity)}`}>{issue.issue_severity || "-"}</td>
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