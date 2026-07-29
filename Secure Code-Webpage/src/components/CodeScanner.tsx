import { useState, useRef, useMemo, useEffect } from "react";
import { AxiosError } from "axios";
import api from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Header from "@/components/layout/Header";
import Footer from "@/components/Footer";
import CodeMirrorEditor from "@/components/CodeMirrorEditor";
import Reveal from "@/components/effects/Reveal";
import PaginationBar from "@/components/PaginationBar";
import CweBadge from "@/components/CweBadge";
import { useMutation } from "@tanstack/react-query";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { toast } from "sonner";
import { z } from "zod";
import { BanditResponse, BanditItem } from "@/lib/schemas";
import {
  Upload, FileCode, X, Shield, Loader2, AlertTriangle, CheckCircle2, XCircle, AlertCircle, ArrowUpDown,
} from "lucide-react";

const MAX_FILE_SIZE_BYTES = 500 * 1024;
const MAX_FILE_COUNT = 10;
const ISSUES_PER_PAGE = 8;

type CodeFile = { filename: string; content: string };
type ScanResult = z.infer<typeof BanditResponse>;
type Issue = z.infer<typeof BanditItem>;
type Filter = "all" | "high" | "medium" | "low";
type SortBy = "severity" | "line" | "file" | "cwe";

const baseName = (p?: string) => (p ? p.split(/[\\/]/).pop() || p : "");
const SEVERITY_RANK: Record<string, number> = { high: 3, medium: 2, low: 1 };

export default function CodeScanner() {
  const [files, setFiles] = useState<CodeFile[]>([{ filename: "app.py", content: "" }]);
  const [language, setLanguage] = useState("python");
  const [issues, setIssues] = useState<Issue[]>([]);
  const [scanComplete, setScanComplete] = useState(false);
  const [score, setScore] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sortBy, setSortBy] = useState<SortBy>("severity");
  const [page, setPage] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (index: number, field: keyof CodeFile, value: string) => {
    setFiles((prev) => prev.map((f, i) => (i === index ? { ...f, [field]: value } : f)));
  };
  const addFile = () =>
    setFiles((prev) => [...prev, { filename: `file${prev.length + 1}.${language === "python" ? "py" : "js"}`, content: "" }]);
  const deleteFile = (index: number) => setFiles((prev) => prev.filter((_, i) => i !== index));

  const readFileContent = (file: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });

  const handleFileUpload = async (uploadedFiles: FileList | null) => {
    if (!uploadedFiles || uploadedFiles.length === 0) return;
    const fileArray = Array.from(uploadedFiles);
    const validExtensions = language === "python" ? [".py", ".pyw"] : [".js", ".jsx", ".ts", ".tsx", ".mjs"];
    if (files.filter((f) => f.content.trim() !== "").length + fileArray.length > MAX_FILE_COUNT) {
      toast.error(`Maximum ${MAX_FILE_COUNT} files allowed per scan.`);
      return;
    }
    const newFiles: CodeFile[] = [];
    for (const file of fileArray) {
      const ext = file.name.substring(file.name.lastIndexOf("."));
      if (!validExtensions.includes(ext.toLowerCase())) {
        toast.error(`Invalid file type: ${file.name}.`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast.error(`${file.name} exceeds 500 KB limit.`);
        continue;
      }
      try {
        newFiles.push({ filename: file.name, content: await readFileContent(file) });
      } catch {
        toast.error(`Failed to read file: ${file.name}`);
      }
    }
    if (newFiles.length > 0) {
      setFiles((prev) => (prev.length === 1 && prev[0].content === "" ? newFiles : [...prev, ...newFiles]));
      toast.success(`${newFiles.length} file(s) uploaded!`);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const scanMutation = useMutation<ScanResult, AxiosError, { files: CodeFile[]; language: string }>({
    mutationFn: async (payload) => {
      const res = await api.post("/api/scan", payload);
      return res.data.result || {};
    },
    onSuccess: (parsed) => {
      const resultIssues = Array.isArray(parsed.results) ? parsed.results : [];
      setIssues(resultIssues);
      setScanComplete(true);
      let n = 100;
      resultIssues.forEach((i) => {
        const s = i.issue_severity?.toLowerCase();
        if (s === "high") n -= 10;
        else if (s === "medium") n -= 5;
        else if (s === "low") n -= 2;
      });
      n = Math.max(0, n);
      const grade = n >= 95 ? "A+" : n >= 85 ? "A" : n >= 75 ? "B" : n >= 65 ? "C" : n >= 50 ? "D" : "F";
      setScore(`${n} (${grade})`);
      toast.success("Scan complete!");
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, "Scan failed"));
      setIssues([]);
      setScanComplete(true);
      setScore("N/A");
    },
  });

  const handleScan = () => {
    if (!files.some((f) => f.content.trim() !== "")) {
      toast.error("Please add some code or upload files before scanning.");
      return;
    }
    setFilter("all");
    scanMutation.mutate({ files, language });
  };

  const counts = useMemo(() => ({
    high: issues.filter((i) => i.issue_severity?.toLowerCase() === "high").length,
    medium: issues.filter((i) => i.issue_severity?.toLowerCase() === "medium").length,
    low: issues.filter((i) => i.issue_severity?.toLowerCase() === "low").length,
  }), [issues]);

  const sortedFilteredIssues = useMemo(() => {
    const list = filter === "all" ? issues : issues.filter((i) => i.issue_severity?.toLowerCase() === filter);
    const sorted = [...list].sort((a, b) => {
      switch (sortBy) {
        case "line":
          return (a.line_number ?? 0) - (b.line_number ?? 0);
        case "file":
          return baseName(a.filename).localeCompare(baseName(b.filename));
        case "cwe":
          return (a.issue_cwe?.id ?? 0) - (b.issue_cwe?.id ?? 0);
        case "severity":
        default:
          return (SEVERITY_RANK[b.issue_severity?.toLowerCase() ?? ""] ?? 0) -
                 (SEVERITY_RANK[a.issue_severity?.toLowerCase() ?? ""] ?? 0);
      }
    });
    return sorted;
  }, [issues, filter, sortBy]);

  // Reset to the first page whenever the list, filter, or sort changes.
  useEffect(() => { setPage(1); }, [filter, sortBy, issues]);

  const pageIssues = sortedFilteredIssues.slice((page - 1) * ISSUES_PER_PAGE, page * ISSUES_PER_PAGE);

  const highlightFor = (filename: string) =>
    issues.filter((i) => baseName(i.filename) === baseName(filename) && i.line_number).map((i) => i.line_number as number);

  const sevBadge = (s?: string) => {
    const k = s?.toLowerCase();
    if (k === "high") return "bg-destructive/15 text-destructive";
    if (k === "medium") return "bg-warning/15 text-warning";
    if (k === "low") return "bg-success/15 text-success";
    return "bg-muted text-muted-foreground";
  };

  return (
    <div className="relative min-h-screen bg-background bg-grid">
      <div className="pointer-events-none absolute inset-0 bg-gradient-twilight" />
      <Header />
      <main className="relative mx-auto max-w-7xl px-4 py-12">
        <Reveal className="mb-10 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            <Shield className="h-4 w-4" /> Security Scanner
          </span>
          <h1 className="mt-4 font-display text-3xl font-medium sm:text-4xl">
            Scan your code for <span className="text-gradient">vulnerabilities</span>
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Powered by Bandit (Python) and Semgrep (JavaScript). Findings are mapped to CWEs and scored A–F.
          </p>
        </Reveal>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Input column */}
          <div className="space-y-6">
            <div className="glass rounded-2xl p-6">
              <label className="mb-2 block text-sm font-medium text-foreground/80">Language</label>
              <Select onValueChange={setLanguage} defaultValue="python">
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="python">Python</SelectItem>
                  <SelectItem value="javascript">JavaScript</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Drop zone */}
            <div
              onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragOver={(e) => e.preventDefault()}
              onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
              onDrop={handleDrop}
              className={`rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
                isDragging ? "border-primary bg-primary/10 scale-[1.01]" : "border-border/60 bg-card/30 hover:border-primary/50"
              }`}
            >
              <Upload className={`mx-auto mb-3 h-10 w-10 ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
              <p className="mb-3 font-medium">{isDragging ? "Drop files here" : "Drag & drop your code files"}</p>
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                <FileCode className="mr-2 h-4 w-4" /> Browse Files
              </Button>
              <p className="mt-3 text-xs text-muted-foreground">
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

            {/* Editors */}
            <div className="space-y-4">
              {files.map((file, index) => (
                <div key={index} className="glass rounded-2xl p-4">
                  <div className="mb-3 flex items-center gap-3">
                    <Input
                      value={file.filename}
                      onChange={(e) => handleFileChange(index, "filename", e.target.value)}
                      className="flex-1 font-mono text-sm"
                    />
                    {files.length > 1 && (
                      <Button variant="ghost" size="sm" onClick={() => deleteFile(index)} className="text-destructive hover:bg-destructive/10">
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <CodeMirrorEditor
                    value={file.content}
                    onChange={(v) => handleFileChange(index, "content", v)}
                    language={language}
                    highlight={scanComplete ? highlightFor(file.filename) : []}
                    placeholder="Paste your code here..."
                    height="260px"
                  />
                </div>
              ))}
              <Button variant="outline" onClick={addFile} className="w-full">+ Add File</Button>

              <Button
                onClick={handleScan}
                disabled={scanMutation.isPending}
                className="h-14 w-full bg-gradient-primary text-base font-medium text-primary-foreground shadow-glow transition-shadow hover:shadow-glow-accent"
              >
                {scanMutation.isPending ? (
                  <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Scanning...</>
                ) : (
                  <><Shield className="mr-2 h-5 w-5" /> Start Security Scan</>
                )}
              </Button>
            </div>
          </div>

          {/* Results column */}
          <div className="space-y-6">
            {!scanComplete ? (
              <div className="glass flex min-h-[600px] items-center justify-center rounded-2xl p-12 text-center">
                <div>
                  <div className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-full bg-primary/10">
                    <Shield className="h-10 w-10 text-primary" />
                  </div>
                  <p className="text-lg text-muted-foreground">No scan results yet</p>
                  <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground/70">
                    Add code or upload files, then start a scan to see vulnerabilities here.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="glass rounded-2xl p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-display text-lg font-medium">
                      <CheckCircle2 className="h-5 w-5 text-success" /> Scan complete
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Security score</p>
                      <p className="text-2xl font-medium text-gradient">{score}</p>
                    </div>
                  </div>
                  {issues.length === 0 ? (
                    <div className="mt-6 text-center">
                      <CheckCircle2 className="mx-auto mb-3 h-14 w-14 text-success" />
                      <p className="text-lg font-medium text-success">No vulnerabilities found!</p>
                    </div>
                  ) : (
                    <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap gap-2">
                        {(["all", "high", "medium", "low"] as Filter[]).map((f) => (
                          <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                              filter === f ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {f === "all" ? `All (${issues.length})` : `${f} (${counts[f]})`}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
                          <SelectTrigger className="h-9 w-[150px] text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="severity">Severity</SelectItem>
                            <SelectItem value="line">Line number</SelectItem>
                            <SelectItem value="file">File name</SelectItem>
                            <SelectItem value="cwe">CWE</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>

                {sortedFilteredIssues.length > 0 && (
                  <div className="glass space-y-3 rounded-2xl p-6">
                    <div className="flex items-center gap-2 font-display text-lg font-medium">
                      <AlertTriangle className="h-5 w-5 text-warning" /> Detected vulnerabilities
                    </div>
                    {pageIssues.map((issue, idx) => (
                      <Reveal key={(page - 1) * ISSUES_PER_PAGE + idx} delay={Math.min(idx * 0.04, 0.3)} direction="up">
                        <div className="rounded-xl border border-border/60 bg-card/40 p-4">
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              {issue.issue_severity?.toLowerCase() === "high" ? (
                                <XCircle className="h-4 w-4 text-destructive" />
                              ) : issue.issue_severity?.toLowerCase() === "medium" ? (
                                <AlertTriangle className="h-4 w-4 text-warning" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-success" />
                              )}
                              <span className="font-mono text-xs text-muted-foreground">
                                {baseName(issue.filename)}:{issue.line_number || "?"}
                              </span>
                            </div>
                            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${sevBadge(issue.issue_severity)}`}>
                              {issue.issue_severity || "-"}
                            </span>
                          </div>
                          <p className="text-sm text-foreground/80">{issue.issue_text || "-"}</p>
                          <CweBadge id={issue.issue_cwe?.id} link={issue.issue_cwe?.link} className="mt-2 inline-block text-xs" />
                        </div>
                      </Reveal>
                    ))}
                    <PaginationBar
                      page={page}
                      pageSize={ISSUES_PER_PAGE}
                      total={sortedFilteredIssues.length}
                      onPageChange={setPage}
                      itemLabel="vulnerabilities"
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
