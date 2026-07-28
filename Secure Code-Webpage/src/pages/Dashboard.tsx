import { useState, useEffect } from "react";
import { AxiosError } from "axios";
import api from "@/lib/api";
import { getToken, clearAuth } from "@/lib/auth";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/Footer";
import ScanResultsTable from "@/components/ScanResultsTable";
import CodeMirrorEditor from "@/components/CodeMirrorEditor";
import Reveal from "@/components/effects/Reveal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Code2, ShieldCheck, Loader2, Copy, CheckCircle2, Activity, Sparkles, TrendingUp, ChartColumn,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { BanditItem } from "@/lib/schemas";

type Issue = z.infer<typeof BanditItem>;
interface Candidate { model: string; code: string }
interface Explanation { change: string; reason: string }
interface HistoryItem {
  language?: string;
  code?: string;
  enhanced_code?: string;
  result?: { results?: Issue[] };
  timestamp?: string;
  candidates?: Candidate[];
  explanations?: Explanation[];
}
interface HistoryData { enhance: HistoryItem[]; scan: HistoryItem[] }

const ITEMS_PER_PAGE = 5;

const fetchHistory = async (): Promise<HistoryData> => {
  if (!getToken()) throw new Error("You must be logged in to view the dashboard.");
  const { data } = await api.get("/api/history");
  return data;
};

export default function Dashboard() {
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);
  const [selectedType, setSelectedType] = useState<"enhancer" | "scanner" | null>(null);
  const [enhancePage, setEnhancePage] = useState(1);
  const [scanPage, setScanPage] = useState(1);
  const navigate = useNavigate();

  const { data: history, isLoading, error } = useQuery<HistoryData, AxiosError>({
    queryKey: ["history"],
    queryFn: fetchHistory,
  });

  useEffect(() => {
    if (!error) return;
    if (error.response?.status === 401) {
      toast.error("Session expired. Please log in again.");
      clearAuth();
      navigate("/login");
    } else {
      toast.error("Failed to load history");
    }
  }, [error, navigate]);

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code || "");
    setCopySuccess(id);
    toast.success("Code copied!");
    setTimeout(() => setCopySuccess(null), 2000);
  };

  const paginate = (data: HistoryItem[], page: number) => data.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  return (
    <div className="relative min-h-screen bg-background bg-grid">
      <div className="pointer-events-none absolute inset-0 bg-gradient-twilight" />
      <Header />
      <main className="relative mx-auto max-w-6xl px-4 py-12">
        <Reveal className="mb-10 text-center">
          <h1 className="font-display text-4xl font-medium sm:text-5xl">
            Your <span className="text-gradient">security dashboard</span>
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Monitor your code enhancements and security scans in one place.
          </p>
        </Reveal>

        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          <StatsCard icon={<Code2 className="h-6 w-6" />} title="Enhancements" value={history?.enhance?.length || 0} />
          <StatsCard icon={<ShieldCheck className="h-6 w-6" />} title="Security scans" value={history?.scan?.length || 0} />
          <StatsCard icon={<TrendingUp className="h-6 w-6" />} title="Total actions" value={(history?.enhance?.length || 0) + (history?.scan?.length || 0)} />
        </div>

        <div className="mb-10 grid gap-6 md:grid-cols-3">
          <ActivityFeed history={history} />
          <TipsCard />
          <QuickActions navigate={navigate} />
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-3 text-muted-foreground">Loading your dashboard...</p>
          </div>
        ) : error ? (
          <p className="text-center text-destructive">{error.message}</p>
        ) : (
          <Tabs defaultValue="enhancer" className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-2xl border border-border/60 bg-card/40 p-1">
              <TabsTrigger value="enhancer" className="rounded-xl data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground">
                <Sparkles className="mr-2 h-4 w-4" /> Enhancements
              </TabsTrigger>
              <TabsTrigger value="scanner" className="rounded-xl data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground">
                <Activity className="mr-2 h-4 w-4" /> Security scans
              </TabsTrigger>
            </TabsList>

            <TabsContent value="enhancer" className="mt-8">
              {history?.enhance?.length ? (
                <>
                  <ListView data={paginate(history.enhance, enhancePage)} type="enhancer" onOpen={(i) => { setSelectedItem(i); setSelectedType("enhancer"); }} />
                  <PaginationControls totalItems={history.enhance.length} currentPage={enhancePage} setPage={setEnhancePage} />
                </>
              ) : (
                <EmptyState icon={<Sparkles className="h-8 w-8" />} title="No enhancements yet" description="Your AI-enhanced code will appear here." />
              )}
            </TabsContent>

            <TabsContent value="scanner" className="mt-8">
              {history?.scan?.length ? (
                <>
                  <ListView data={paginate(history.scan, scanPage)} type="scanner" onOpen={(i) => { setSelectedItem(i); setSelectedType("scanner"); }} />
                  <PaginationControls totalItems={history.scan.length} currentPage={scanPage} setPage={setScanPage} />
                </>
              ) : (
                <EmptyState icon={<Activity className="h-8 w-8" />} title="No security scans yet" description="Your scan results will appear here." />
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>

      <Dialog open={!!selectedItem} onOpenChange={() => { setSelectedItem(null); setSelectedType(null); }}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl text-gradient">
              {selectedType === "enhancer" ? "Code enhancement details" : "Security scan results"}
            </DialogTitle>
            <DialogDescription>
              {selectedItem?.language?.toUpperCase() || "Unknown"} ·{" "}
              {selectedItem?.timestamp ? new Date(selectedItem.timestamp).toLocaleString() : "No time"}
            </DialogDescription>
          </DialogHeader>

          {selectedType === "enhancer" && selectedItem && (
            <div className="grid gap-6">
              <CodeBlock title="Original code" code={selectedItem.code ?? ""} language={selectedItem.language} onCopy={handleCopy} copySuccess={copySuccess} copyId="orig" />
              <CodeBlock title="Enhanced code" code={selectedItem.enhanced_code ?? ""} language={selectedItem.language} onCopy={handleCopy} copySuccess={copySuccess} copyId="enh" />
              {Array.isArray(selectedItem.explanations) && selectedItem.explanations.length > 0 && (
                <div className="rounded-xl border border-success/30 bg-success/10 p-4">
                  <h4 className="mb-2 flex items-center gap-2 font-medium"><ShieldCheck className="h-5 w-5 text-success" /> Security explanations</h4>
                  <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                    {selectedItem.explanations.map((ex, i) => (<li key={i}><strong className="text-foreground">{ex.change}:</strong> {ex.reason}</li>))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {selectedType === "scanner" && selectedItem && (
            <ScanResultsTable issues={Array.isArray(selectedItem.result?.results) ? selectedItem.result.results : []} />
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}

function StatsCard({ icon, title, value }: { icon: React.ReactNode; title: string; value: number }) {
  return (
    <Card className="group border-border/60 bg-card/40 transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-glow">
      <CardContent className="flex items-center justify-between p-6">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="font-display text-4xl font-medium">{value}</p>
        </div>
        <div className="grid h-14 w-14 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow transition-transform group-hover:scale-110">
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

function ListView({ data, type, onOpen }: { data: HistoryItem[]; type: "enhancer" | "scanner"; onOpen: (i: HistoryItem) => void }) {
  return (
    <div className="divide-y divide-border/50 overflow-hidden rounded-2xl border border-border/60 bg-card/40">
      {data.map((item, idx) => (
        <button key={idx} onClick={() => onOpen(item)} className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-secondary/30">
          <div className="flex items-center gap-4">
            <div className="grid h-11 w-11 place-items-center rounded-lg bg-gradient-primary text-primary-foreground">
              {type === "enhancer" ? <Sparkles className="h-5 w-5" /> : <Activity className="h-5 w-5" />}
            </div>
            <div>
              <p className="font-medium">{item.language?.toUpperCase() || "Unknown"} {type === "enhancer" ? "Enhancement" : "Scan"}</p>
              <p className="text-sm text-muted-foreground">{item.timestamp ? new Date(item.timestamp).toLocaleString() : "Unknown time"}</p>
            </div>
          </div>
          <span className="text-sm font-medium text-primary">View details →</span>
        </button>
      ))}
    </div>
  );
}

function PaginationControls({ totalItems, currentPage, setPage }: { totalItems: number; currentPage: number; setPage: (p: number) => void }) {
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  if (totalPages <= 1) return null;
  return (
    <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
      <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</Button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
        <Button key={p} size="sm" onClick={() => setPage(p)}
          className={`h-10 w-10 rounded-full ${p === currentPage ? "bg-gradient-primary text-primary-foreground" : "border border-border/60 bg-card/40 text-foreground hover:border-primary/50"}`}>
          {p}
        </Button>
      ))}
      <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>Next</Button>
    </div>
  );
}

function CodeBlock({ title, code, language, onCopy, copySuccess, copyId }: { title: string; code: string; language?: string; onCopy: (c: string, id: string) => void; copySuccess: string | null; copyId: string }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="flex items-center gap-2 font-display text-lg font-medium"><Code2 className="h-5 w-5 text-primary" /> {title}</h4>
        <Button variant="outline" size="sm" onClick={() => onCopy(code, copyId)}>
          {copySuccess === copyId ? <CheckCircle2 className="mr-1 h-4 w-4 text-success" /> : <Copy className="mr-1 h-4 w-4" />}
          {copySuccess === copyId ? "Copied" : "Copy"}
        </Button>
      </div>
      <CodeMirrorEditor value={code || "// No code available"} language={language || "python"} readOnly height="300px" />
    </div>
  );
}

function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <Card className="border-border/60 bg-card/40">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">{icon}</div>
        <h3 className="font-display text-2xl font-medium">{title}</h3>
        <p className="mt-2 max-w-md text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function ActivityFeed({ history }: { history: HistoryData | undefined }) {
  const all = [...(history?.enhance || []), ...(history?.scan || [])]
    .sort((a, b) => new Date(b.timestamp || "").getTime() - new Date(a.timestamp || "").getTime())
    .slice(0, 3);
  return (
    <Card className="border-border/60 bg-card/40">
      <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-lg"><Activity className="h-5 w-5 text-primary" /> Recent activity</CardTitle></CardHeader>
      <CardContent className="space-y-3 pt-0">
        {all.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">No activity yet</p>
        ) : all.map((item, idx) => (
          <div key={idx} className="flex items-center gap-3 rounded-lg p-2 text-sm transition-colors hover:bg-secondary/30">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-primary text-primary-foreground">
              {item.enhanced_code ? <Sparkles className="h-4 w-4" /> : <Activity className="h-4 w-4" />}
            </div>
            <div>
              <p className="font-medium">{item.language?.toUpperCase() || "Unknown"} {item.enhanced_code ? "Enhancement" : "Scan"}</p>
              <p className="text-xs text-muted-foreground">{new Date(item.timestamp || "").toLocaleString()}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function TipsCard() {
  const tips = [
    "Use parameterized queries to avoid SQL injection.",
    "Always validate user input before processing.",
    "Keep dependencies updated to patch vulnerabilities.",
    "Use environment variables for storing secrets.",
  ];
  const tip = tips[Math.floor(Math.random() * tips.length)];
  return (
    <Card className="border-border/60 bg-card/40">
      <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-lg"><Sparkles className="h-5 w-5 text-accent" /> Pro tip</CardTitle></CardHeader>
      <CardContent className="pt-0"><p className="text-sm leading-relaxed text-muted-foreground">{tip}</p></CardContent>
    </Card>
  );
}

function QuickActions({ navigate }: { navigate: (p: string) => void }) {
  const actions = [
    { label: "Enhance code", to: "/enhancer", Icon: Sparkles },
    { label: "Run security scan", to: "/scanner", Icon: Activity },
    { label: "Analyze vulnerabilities", to: "/analytics", Icon: ChartColumn },
  ];
  return (
    <Card className="border-border/60 bg-card/40">
      <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-lg"><Sparkles className="h-5 w-5 text-primary" /> Quick actions</CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-3 pt-0">
        {actions.map(({ label, to, Icon }) => (
          <Button key={to} onClick={() => navigate(to)} className="w-full justify-start bg-gradient-primary text-primary-foreground shadow-glow-sm transition-transform hover:scale-[1.02]">
            <Icon className="mr-2 h-4 w-4" /> {label}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
