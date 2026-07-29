import { useState, useRef, useEffect } from "react";
import { getToken } from "@/lib/auth";
import { getApiBaseURL } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Header from "@/components/layout/Header";
import Footer from "@/components/Footer";
import CodeMirrorEditor from "@/components/CodeMirrorEditor";
import Reveal from "@/components/effects/Reveal";
import PaginationBar from "@/components/PaginationBar";
import { toast } from "sonner";
import {
  Loader2, Sparkles, Upload, FileCode, CheckCircle2, AlertCircle, Copy, Download,
  Cpu, Bot, Plug, XCircle,
} from "lucide-react";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";

type DiffLine = { type: "add" | "remove" | "context"; content: string };
interface Candidate { model: string; code: string }
interface Explanation { change: string; reason: string }
interface EnhanceResult {
  enhanced_code: string;
  diff: DiffLine[];
  candidates: Candidate[];
  explanations: Explanation[];
  engine_used?: string;
}

type Engine = "deterministic" | "ai";
type LlmStatus = "idle" | "testing" | "ok" | "fail";

const PROVIDERS: Record<string, { label: string; needsKey: boolean; defaultModel: string; baseUrl?: string }> = {
  openai: { label: "OpenAI", needsKey: true, defaultModel: "gpt-4o-mini" },
  anthropic: { label: "Anthropic (Claude)", needsKey: true, defaultModel: "claude-haiku-4-5-20251001" },
  gemini: { label: "Google Gemini", needsKey: true, defaultModel: "gemini-1.5-flash" },
  deepseek: { label: "DeepSeek", needsKey: true, defaultModel: "deepseek-chat" },
  openrouter: { label: "OpenRouter", needsKey: true, defaultModel: "openai/gpt-4o-mini" },
  ollama: { label: "Ollama (local)", needsKey: false, defaultModel: "llama3.2", baseUrl: "http://localhost:11434/v1" },
};

const EXPLANATIONS_PER_PAGE = 6;
const DIFF_LINES_PER_PAGE = 30;

export default function Enhancer() {
  const [code, setCode] = useState("");
  const [filename, setFilename] = useState("code.py");
  const [language, setLanguage] = useState("python");
  const [result, setResult] = useState<EnhanceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [explPage, setExplPage] = useState(1);
  const [diffPage, setDiffPage] = useState(1);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Engine / AI-provider config -----------------------------------------
  const [engine, setEngine] = useState<Engine>("deterministic");
  const [provider, setProvider] = useState("openai");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [llmStatus, setLlmStatus] = useState<LlmStatus>("idle");
  const [llmMessage, setLlmMessage] = useState("");

  // Restore saved config (kept in this browser only).
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem("fortiscan_llm") || "{}");
      if (s.engine) setEngine(s.engine);
      if (s.provider) setProvider(s.provider);
      if (typeof s.apiKey === "string") setApiKey(s.apiKey);
      if (typeof s.model === "string") setModel(s.model);
      if (typeof s.baseUrl === "string") setBaseUrl(s.baseUrl);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("fortiscan_llm", JSON.stringify({ engine, provider, apiKey, model, baseUrl }));
  }, [engine, provider, apiKey, model, baseUrl]);

  // Any config change invalidates a previous "live" check.
  useEffect(() => {
    setLlmStatus("idle");
    setLlmMessage("");
  }, [provider, apiKey, model, baseUrl]);

  const testConnection = async () => {
    const token = getToken();
    if (!token) {
      toast.error("You must be logged in!");
      return;
    }
    if (PROVIDERS[provider].needsKey && !apiKey.trim()) {
      toast.error("Enter an API key first.");
      return;
    }
    setLlmStatus("testing");
    setLlmMessage("");
    try {
      const res = await fetch(`${getApiBaseURL()}/api/test-llm`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ provider, api_key: apiKey, model, base_url: baseUrl }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setLlmStatus("ok");
        setLlmMessage(data.message || "Provider is live.");
        toast.success("Provider is live!");
      } else {
        setLlmStatus("fail");
        setLlmMessage(data.message || data.error || "Connection failed.");
      }
    } catch {
      setLlmStatus("fail");
      setLlmMessage("Could not reach the server.");
    }
  };

  const readFileContent = (file: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });

  const handleFileUpload = async (uploadedFiles: FileList | null) => {
    if (!uploadedFiles || uploadedFiles.length === 0) return;
    const file = uploadedFiles[0];
    const ext = file.name.substring(file.name.lastIndexOf("."));
    const valid = language === "python" ? [".py", ".pyw"] : [".js", ".jsx", ".ts", ".tsx", ".mjs"];
    if (!valid.includes(ext.toLowerCase())) {
      toast.error(`Invalid file type. Please upload ${language} files only.`);
      return;
    }
    try {
      setCode(await readFileContent(file));
      setFilename(file.name);
      toast.success(`File "${file.name}" loaded!`);
    } catch {
      toast.error("Failed to read file");
    }
  };

  const handleEnhance = async () => {
    if (!code.trim()) {
      toast.error("Please provide some code to enhance!");
      return;
    }
    const token = getToken();
    if (!token) {
      toast.error("You must be logged in!");
      return;
    }
    if (engine === "ai" && llmStatus !== "ok") {
      toast.error("Test the AI connection first — it must be live before enhancing.");
      return;
    }
    try {
      setLoading(true);
      setResult(null);
      setProgress(0);
      const res = await fetch(`${getApiBaseURL()}/api/enhance-stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          code,
          language,
          engine,
          ...(engine === "ai" ? { llm: { provider, api_key: apiKey, model, base_url: baseUrl } } : {}),
        }),
      });
      if (!res.ok || !res.body) throw new Error("Server error");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const msg = JSON.parse(line);
          if (msg.type === "progress") setProgress(msg.progress);
          if (msg.type === "result") {
            setResult(msg.data);
            setExplPage(1);
            setDiffPage(1);
            setActiveTab(0);
            setLoading(false);
            toast.success("Enhancement complete!");
          }
          if (msg.type === "error") {
            toast.error(msg.message);
            setLoading(false);
          }
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Enhancement failed");
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };
  const downloadCode = (text: string, fname: string) => {
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = fname;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("File downloaded!");
  };

  return (
    <div className="relative min-h-screen bg-background bg-grid">
      <div className="pointer-events-none absolute inset-0 bg-gradient-twilight" />
      <Header />
      <main className="relative mx-auto max-w-7xl px-4 py-12">
        <Reveal className="mb-10 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-sm font-medium text-accent">
            <Sparkles className="h-4 w-4" /> AI Enhancer
          </span>
          <h1 className="mt-4 font-display text-3xl font-medium sm:text-4xl">
            Turn insecure code <span className="text-gradient">secure</span>
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Deterministic fixes for known-insecure patterns, with a clear diff and an explanation for every change.
          </p>
        </Reveal>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Input */}
          <div className="space-y-6">
            {/* Engine picker */}
            <div className="glass space-y-4 rounded-2xl p-6">
              <div className="font-display text-lg font-medium">Enhancement engine</div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setEngine("deterministic")}
                  className={`rounded-xl border p-4 text-left transition-all ${
                    engine === "deterministic"
                      ? "border-primary bg-primary/10 shadow-glow-sm"
                      : "border-border/60 bg-card/30 hover:border-primary/50"
                  }`}
                >
                  <div className="mb-1 flex items-center gap-2 font-medium">
                    <Cpu className="h-4 w-4 text-primary" /> Deterministic
                  </div>
                  <p className="text-xs text-muted-foreground">Rule-based AST fixes. Instant, offline, always valid code. Recommended.</p>
                </button>
                <button
                  type="button"
                  onClick={() => setEngine("ai")}
                  className={`rounded-xl border p-4 text-left transition-all ${
                    engine === "ai"
                      ? "border-accent bg-accent/10 shadow-glow-sm"
                      : "border-border/60 bg-card/30 hover:border-accent/50"
                  }`}
                >
                  <div className="mb-1 flex items-center gap-2 font-medium">
                    <Bot className="h-4 w-4 text-accent" /> AI model
                  </div>
                  <p className="text-xs text-muted-foreground">Full rewrite by your own LLM. Bring a key and test it live first.</p>
                </button>
              </div>

              {engine === "ai" && (
                <div className="space-y-3 rounded-xl border border-border/60 bg-card/40 p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-foreground/80">Provider</label>
                      <Select value={provider} onValueChange={setProvider}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(PROVIDERS).map(([key, p]) => (
                            <SelectItem key={key} value={key}>{p.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-foreground/80">
                        Model <span className="opacity-60">(optional)</span>
                      </label>
                      <Input
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        placeholder={PROVIDERS[provider].defaultModel}
                        className="font-mono text-sm"
                      />
                    </div>
                  </div>

                  {PROVIDERS[provider].needsKey ? (
                    <div>
                      <label className="mb-2 block text-sm font-medium text-foreground/80">API key</label>
                      <Input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Paste your provider API key"
                        className="font-mono text-sm"
                        autoComplete="off"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="mb-2 block text-sm font-medium text-foreground/80">Ollama base URL</label>
                      <Input
                        value={baseUrl}
                        onChange={(e) => setBaseUrl(e.target.value)}
                        placeholder={PROVIDERS[provider].baseUrl}
                        className="font-mono text-sm"
                      />
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-3">
                    <Button variant="outline" size="sm" onClick={testConnection} disabled={llmStatus === "testing"}>
                      {llmStatus === "testing" ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Testing...</>
                      ) : (
                        <><Plug className="mr-2 h-4 w-4" /> Test connection</>
                      )}
                    </Button>
                    {llmStatus === "ok" && (
                      <span className="inline-flex items-center gap-1.5 text-sm text-success">
                        <CheckCircle2 className="h-4 w-4" /> {llmMessage}
                      </span>
                    )}
                    {llmStatus === "fail" && (
                      <span className="inline-flex items-center gap-1.5 text-sm text-destructive">
                        <XCircle className="h-4 w-4" /> {llmMessage}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Your key is used only to run this request and is kept in this browser. It is never stored on our servers.
                  </p>
                </div>
              )}
            </div>

            <div className="glass grid gap-4 rounded-2xl p-6 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground/80">Language</label>
                <Select onValueChange={setLanguage} defaultValue="python">
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="python">Python</SelectItem>
                    <SelectItem value="javascript">JavaScript</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground/80">Filename</label>
                <Input value={filename} onChange={(e) => setFilename(e.target.value)} className="font-mono text-sm" />
              </div>
            </div>

            <div
              onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragOver={(e) => e.preventDefault()}
              onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFileUpload(e.dataTransfer.files); }}
              className={`rounded-2xl border-2 border-dashed p-6 text-center transition-all ${
                isDragging ? "border-primary bg-primary/10" : "border-border/60 bg-card/30 hover:border-primary/50"
              }`}
            >
              <Upload className={`mx-auto mb-2 h-8 w-8 ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <FileCode className="mr-2 h-4 w-4" /> Browse File
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept={language === "python" ? ".py,.pyw" : ".js,.jsx,.ts,.tsx,.mjs"}
                onChange={(e) => handleFileUpload(e.target.files)}
                className="hidden"
              />
            </div>

            <div className="glass rounded-2xl p-4">
              <CodeMirrorEditor
                value={code}
                onChange={setCode}
                language={language}
                placeholder="Paste your insecure or inefficient code here..."
                height="360px"
              />
            </div>

            <Button
              onClick={handleEnhance}
              disabled={loading || !code.trim() || (engine === "ai" && llmStatus !== "ok")}
              className="h-14 w-full bg-gradient-primary text-base font-medium text-primary-foreground shadow-glow transition-shadow hover:shadow-glow-accent"
            >
              {loading ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Enhancing...</>
              ) : engine === "ai" ? (
                <><Bot className="mr-2 h-5 w-5" /> Enhance with AI</>
              ) : (
                <><Sparkles className="mr-2 h-5 w-5" /> Enhance Code</>
              )}
            </Button>
            {engine === "ai" && llmStatus !== "ok" && (
              <p className="text-center text-xs text-muted-foreground">
                Test your AI provider connection above to enable enhancing.
              </p>
            )}
            {loading && (
              <div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-gradient-primary transition-all duration-500" style={{ width: `${Math.max(progress, 12)}%` }} />
                </div>
                <p className="mt-1 text-center text-xs text-muted-foreground">
                  {progress <= 20 ? "Analyzing your code..." : `${progress}%`}
                </p>
              </div>
            )}
          </div>

          {/* Results */}
          <div className="space-y-6">
            {!result ? (
              <div className="glass flex min-h-[600px] items-center justify-center rounded-2xl p-12 text-center">
                <div>
                  <div className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-full bg-accent/10">
                    <Sparkles className="h-10 w-10 text-accent" />
                  </div>
                  <p className="text-lg text-muted-foreground">No results yet</p>
                  <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground/70">
                    Paste code and click Enhance to see AI-powered improvements.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="glass rounded-2xl p-6">
                  <div className="mb-4 flex items-center gap-2 font-display text-lg font-medium">
                    <CheckCircle2 className="h-5 w-5 text-success" /> What changed &amp; why
                  </div>
                  {result.explanations?.length ? (
                    <>
                      <ul className="space-y-3">
                        {result.explanations
                          .slice((explPage - 1) * EXPLANATIONS_PER_PAGE, explPage * EXPLANATIONS_PER_PAGE)
                          .map((ex, i) => (
                            <li key={(explPage - 1) * EXPLANATIONS_PER_PAGE + i} className="flex gap-3">
                              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-success" />
                              <div className="text-sm">
                                <strong>{ex.change}:</strong>{" "}
                                <span className="text-muted-foreground">{ex.reason}</span>
                              </div>
                            </li>
                          ))}
                      </ul>
                      <PaginationBar
                        page={explPage}
                        pageSize={EXPLANATIONS_PER_PAGE}
                        total={result.explanations.length}
                        onPageChange={setExplPage}
                        itemLabel="changes"
                      />
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">No specific explanations provided.</p>
                  )}
                </div>

                {result.candidates?.length > 0 && (
                  <div className="glass rounded-2xl p-6">
                    <div className="mb-4 font-display text-lg font-medium">
                      {result.candidates.length > 1 ? "Suggested fixes" : "Secure code"}
                    </div>
                    <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
                      {result.candidates.map((c, i) => (
                        <Button
                          key={i}
                          variant={activeTab === i ? "default" : "outline"}
                          size="sm"
                          onClick={() => setActiveTab(i)}
                          className={activeTab === i ? "flex-shrink-0 bg-primary text-primary-foreground" : "flex-shrink-0"}
                        >
                          {c.model}
                        </Button>
                      ))}
                    </div>
                    <div className="relative">
                      <div className="absolute right-2 top-2 z-10 flex gap-2">
                        <Button size="icon" variant="ghost" className="h-8 w-8 bg-background/60" onClick={() => copyToClipboard(result.candidates[activeTab].code)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 bg-background/60"
                          onClick={() => downloadCode(result.candidates[activeTab].code, `enhanced_${result.candidates[activeTab].model}_${filename}`)}>
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                      <CodeMirrorEditor value={result.candidates[activeTab].code} language={language} readOnly height="320px" />
                    </div>
                  </div>
                )}

                <div className="glass rounded-2xl p-6">
                  <div className="mb-1 font-display text-lg font-medium">Code changes (diff)</div>
                  <p className="mb-4 text-sm text-muted-foreground">Red removed · green added</p>
                  {(result.diff?.length ?? 0) === 0 ? (
                    <p className="text-sm text-muted-foreground">No line-level changes (advisory-only findings).</p>
                  ) : (
                    <>
                      <div className="overflow-hidden rounded-xl border border-border/60 font-mono text-xs">
                        {result.diff
                          .slice((diffPage - 1) * DIFF_LINES_PER_PAGE, diffPage * DIFF_LINES_PER_PAGE)
                          .map((line, i) => (
                            <div
                              key={(diffPage - 1) * DIFF_LINES_PER_PAGE + i}
                              className={`px-4 py-1 ${
                                line.type === "add"
                                  ? "border-l-2 border-success bg-success/10 text-success"
                                  : line.type === "remove"
                                  ? "border-l-2 border-destructive bg-destructive/10 text-destructive"
                                  : "text-muted-foreground"
                              }`}
                            >
                              <span className="mr-2 select-none opacity-50">
                                {line.type === "add" ? "+" : line.type === "remove" ? "-" : " "}
                              </span>
                              {line.content}
                            </div>
                          ))}
                      </div>
                      <PaginationBar
                        page={diffPage}
                        pageSize={DIFF_LINES_PER_PAGE}
                        total={result.diff.length}
                        onPageChange={setDiffPage}
                        itemLabel="lines"
                      />
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
