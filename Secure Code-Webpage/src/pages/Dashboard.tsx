import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import SecurityHeader from "@/components/SecurityHeader";
import Footer from "@/components/Footer";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Code2,
  ShieldCheck,
  Loader2,
  Copy,
  CheckCircle2,
  Activity,
  Sparkles,
  TrendingUp,
} from "lucide-react";

interface HistoryItem {
  language?: string;
  code?: string;
  enhanced_code?: string;
  result?: any;
  timestamp?: string;
}

const ITEMS_PER_PAGE = 5;

function getStoredToken(): string | null {
  return localStorage.getItem("token") || sessionStorage.getItem("token") || null;
}

function removeStoredToken() {
  localStorage.removeItem("token");
  sessionStorage.removeItem("token");
}

export default function Dashboard() {
  const [history, setHistory] = useState<{ enhance: HistoryItem[]; scan: HistoryItem[] }>({
    enhance: [],
    scan: [],
  });
  const [loading, setLoading] = useState(true);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);
  const [selectedType, setSelectedType] = useState<"enhancer" | "scanner" | null>(null);

  const [enhancePage, setEnhancePage] = useState(1);
  const [scanPage, setScanPage] = useState(1);

  const navigate = useNavigate();

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      toast.error("You must be logged in to view the dashboard.");
      navigate("/login");
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    axios
      .get("/api/history", {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      })
      .then((res) => {
        const enhance = Array.isArray(res.data?.enhance) ? res.data.enhance : [];
        const scan = Array.isArray(res.data?.scan) ? res.data.scan : [];
        setHistory({ enhance, scan });
      })
      .catch((err) => {
        if (axios.isCancel(err) || err?.name === "CanceledError") return;

        if (err?.response?.status === 401) {
          toast.error("Session expired. Please log in again.");
          removeStoredToken();
          navigate("/login");
        } else {
          toast.error(err?.response?.data?.error || "Failed to load history");
        }
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [navigate]);

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code || "");
    setCopySuccess(id);
    toast.success("Code copied!");
    setTimeout(() => setCopySuccess(null), 2000);
  };

  const openDetails = (item: HistoryItem, type: "enhancer" | "scanner") => {
    setSelectedItem(item);
    setSelectedType(type);
  };

  const closeDetails = () => {
    setSelectedItem(null);
    setSelectedType(null);
  };

  const paginate = (
    data: HistoryItem[],
    currentPage: number
  ): HistoryItem[] => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return data.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <SecurityHeader />

      <div className="p-8 max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4 animate-fade-in">
          <h1 className="text-4xl font-bold tracking-tight">
            Your{" "}
            <span className="bg-gradient-to-r from-blue-500 to-blue-700 bg-clip-text text-transparent">
              Security Dashboard
            </span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Monitor your code enhancements and security scans in one place.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <StatsCard
            icon={<Code2 className="w-6 h-6" />}
            title="Enhancements"
            value={history.enhance.length}
            gradient="bg-gradient-primary"
          />
          <StatsCard
            icon={<ShieldCheck className="w-6 h-6" />}
            title="Security Scans"
            value={history.scan.length}
            gradient="bg-gradient-secondary"
          />
          <StatsCard
            icon={<TrendingUp className="w-6 h-6" />}
            title="Total Actions"
            value={history.enhance.length + history.scan.length}
            gradient="bg-gradient-to-r from-success to-warning"
          />
        </div>

        {/* Extra Components */}
        <div className="grid md:grid-cols-3 gap-6 mt-10">
          <ActivityFeed history={history} />
          <TipsCard />
          <QuickActions navigate={navigate} />
        </div>

        {/* Main Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="p-4 rounded-full bg-primary/10 animate-glow">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
            <p className="text-muted-foreground">Loading your dashboard...</p>
          </div>
        ) : (
          <Tabs defaultValue="enhancer" className="w-full animate-slide-up">
            <TabsList className="grid w-full grid-cols-2 rounded-2xl p-1 bg-card/50 backdrop-blur-sm border shadow-secondary">
              <TabsTrigger
                value="enhancer"
                className="flex gap-2 rounded-xl data-[state=active]:bg-gradient-primary data-[state=active]:text-black data-[state=active]:shadow-glow transition-all duration-300"
              >
                <Sparkles className="w-4 h-4" />
                Enhancement History
              </TabsTrigger>
              <TabsTrigger
                value="scanner"
                className="flex gap-2 rounded-xl data-[state=active]:bg-gradient-secondary data-[state=active]:text-black data-[state=active]:shadow-glow transition-all duration-300"
              >
                <Activity className="w-4 h-4" />
                Security Scans
              </TabsTrigger>
            </TabsList>

            {/* Enhancer List */}
            <TabsContent value="enhancer" className="mt-8">
              {history.enhance.length > 0 ? (
                <>
                  <ListView
                    data={paginate(history.enhance, enhancePage)}
                    type="enhancer"
                    onOpen={openDetails}
                  />
                  <PaginationControls
                    totalItems={history.enhance.length}
                    currentPage={enhancePage}
                    setPage={setEnhancePage}
                  />
                </>
              ) : (
                <EmptyState
                  icon={<Sparkles className="w-8 h-8" />}
                  title="No enhancements yet"
                  description="Your AI-enhanced code will appear here after you run the enhancer."
                  gradient="bg-gradient-primary"
                />
              )}
            </TabsContent>

            {/* Scanner List */}
            <TabsContent value="scanner" className="mt-8">
              {history.scan.length > 0 ? (
                <>
                  <ListView
                    data={paginate(history.scan, scanPage)}
                    type="scanner"
                    onOpen={openDetails}
                  />
                  <PaginationControls
                    totalItems={history.scan.length}
                    currentPage={scanPage}
                    setPage={setScanPage}
                  />
                </>
              ) : (
                <EmptyState
                  icon={<Activity className="w-8 h-8" />}
                  title="No security scans yet"
                  description="Your code scan results will appear here after you run the scanner."
                  gradient="bg-gradient-secondary"
                />
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Popup for Expanded Details */}
      <Dialog open={!!selectedItem} onOpenChange={closeDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedType === "enhancer" ? "Code Enhancement Details" : "Security Scan Results"}
            </DialogTitle>
            <DialogDescription>
              {selectedItem?.language?.toUpperCase() || "Unknown"} |{" "}
              {selectedItem?.timestamp && new Date(selectedItem.timestamp).toLocaleString()}
            </DialogDescription>
          </DialogHeader>

          {/* Show Details */}
          {selectedType === "enhancer" && selectedItem && (
            <div className="grid gap-6">
              <CodeBlock
                title="Original Code"
                code={selectedItem.code || ""}
                variant="original"
                onCopy={handleCopy}
                copySuccess={copySuccess}
                copyId="original-expanded"
              />
              <CodeBlock
                title="Enhanced Code"
                code={selectedItem.enhanced_code || ""}
                variant="enhanced"
                onCopy={handleCopy}
                copySuccess={copySuccess}
                copyId="enhanced-expanded"
              />
            </div>
          )}

          {selectedType === "scanner" && selectedItem && (
            <div className="rounded-lg bg-muted p-4 overflow-x-auto">
              <pre className="text-sm font-mono leading-relaxed whitespace-pre-wrap text-black">
                {JSON.stringify(selectedItem.result, null, 2)}
              </pre>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}

/* ---------------- Helper Components ---------------- */

function StatsCard({ icon, title, value, gradient }: { icon: React.ReactNode; title: string; value: number; gradient: string }) {
  return (
    <Card className="hover-lift border-0 shadow-secondary bg-card/50 backdrop-blur-sm">
      <CardContent className="p-6 flex items-center justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold">{value}</p>
        </div>
        <div className={`p-3 rounded-xl ${gradient} text-white shadow-glow`}>{icon}</div>
      </CardContent>
    </Card>
  );
}

function ListView({ data, type, onOpen }: { data: HistoryItem[]; type: "enhancer" | "scanner"; onOpen: (item: HistoryItem, type: "enhancer" | "scanner") => void }) {
  return (
    <div className="border rounded-xl divide-y">
      {data.map((item, idx) => (
        <div
          key={idx}
          className="flex justify-between items-center p-4 cursor-pointer hover:bg-muted/40 transition-colors"
          onClick={() => onOpen(item, type)}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${type === "enhancer" ? "bg-gradient-primary" : "bg-gradient-secondary"}`}>
              {type === "enhancer" ? <Sparkles className="w-4 h-4 text-white" /> : <Activity className="w-4 h-4 text-white" />}
            </div>
            <div>
              <p className="font-semibold">
                {item.language?.toUpperCase() || "Unknown"} {type === "enhancer" ? "Enhancement" : "Security Scan"}
              </p>
              <p className="text-xs text-muted-foreground">
                {item.timestamp ? new Date(item.timestamp).toLocaleString() : "Unknown time"}
              </p>
            </div>
          </div>
          <span className="text-sm text-muted-foreground">Click to view details →</span>
        </div>
      ))}
    </div>
  );
}

// Enhanced Pagination
function PaginationControls({
  totalItems,
  currentPage,
  setPage,
}: {
  totalItems: number;
  currentPage: number;
  setPage: (page: number) => void;
}) {
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="flex justify-center items-center gap-2 mt-6 flex-wrap">
      <Button
        variant="outline"
        size="sm"
        disabled={currentPage === 1}
        onClick={() => setPage(currentPage - 1)}
      >
        Previous
      </Button>
      {pages.map((p) => (
        <Button
          key={p}
          size="sm"
          variant={p === currentPage ? "default" : "outline"}
          className={`rounded-full w-9 h-9 ${p === currentPage ? "shadow-glow" : ""}`}
          onClick={() => setPage(p)}
        >
          {p}
        </Button>
      ))}
      <Button
        variant="outline"
        size="sm"
        disabled={currentPage === totalPages}
        onClick={() => setPage(currentPage + 1)}
      >
        Next
      </Button>
    </div>
  );
}

function CodeBlock({ title, code, variant, onCopy, copySuccess, copyId }: { title: string; code: string; variant: "original" | "enhanced"; onCopy: (code: string, id: string) => void; copySuccess: string | null; copyId: string }) {
  const isEnhanced = variant === "enhanced";
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h4 className="font-semibold flex items-center gap-2">
          {isEnhanced ? <Sparkles className="w-4 h-4 text-success" /> : <Code2 className="w-4 h-4 text-muted-foreground" />}
          {title}
        </h4>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onCopy(code, copyId)}
          className="hover:bg-primary hover:text-primary-foreground transition-all duration-200"
        >
          {copySuccess === copyId ? <CheckCircle2 className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
        </Button>
      </div>
      <div className={`rounded-xl overflow-hidden ${isEnhanced ? "code-enhanced" : "code-original"}`}>
        <div className={`overflow-y-auto max-h-96 p-6 ${isEnhanced ? "scroll-visible-dark" : "scroll-visible"}`}>
          <pre className="text-sm font-mono leading-relaxed whitespace-pre">
            {code || "// No code available"}
          </pre>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ icon, title, description, gradient }: { icon: React.ReactNode; title: string; description: string; gradient: string }) {
  return (
    <Card className="border-0 shadow-secondary bg-card/30 backdrop-blur-sm">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-6">
        <div className={`p-6 rounded-2xl ${gradient} text-white shadow-glow animate-float`}>{icon}</div>
        <div className="space-y-2">
          <h3 className="text-xl font-semibold">{title}</h3>
          <p className="text-muted-foreground max-w-md leading-relaxed">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------------- Extra Components ---------------- */

// Recent Activity Feed
function ActivityFeed({ history }: { history: { enhance: HistoryItem[]; scan: HistoryItem[] } }) {
  const allHistory = [...history.enhance, ...history.scan]
    .sort((a, b) => (new Date(b.timestamp || "").getTime() - new Date(a.timestamp || "").getTime()))
    .slice(0, 5);

  return (
    <Card className="shadow-secondary border-0 bg-card/40 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-lg">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {allHistory.length === 0 ? (
          <p className="text-muted-foreground text-sm">No activity yet</p>
        ) : (
          allHistory.map((item, idx) => (
            <div key={idx} className="flex items-center gap-3 text-sm">
              <div className={`p-2 rounded-lg ${item.enhanced_code ? "bg-gradient-primary" : "bg-gradient-secondary"} text-white`}>
                {item.enhanced_code ? <Sparkles className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
              </div>
              <div>
                <p className="font-medium">{item.language?.toUpperCase() || "Unknown"} {item.enhanced_code ? "Enhancement" : "Scan"}</p>
                <p className="text-xs text-muted-foreground">{new Date(item.timestamp || "").toLocaleString()}</p>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

// Tips & Insights
function TipsCard() {
  const tips = [
    "Use parameterized queries to avoid SQL injection.",
    "Always validate user input before processing.",
    "Keep dependencies updated to patch vulnerabilities.",
    "Use environment variables for storing secrets.",
  ];
  const randomTip = tips[Math.floor(Math.random() * tips.length)];

  return (
    <Card className="shadow-secondary border-0 bg-gradient-to-r from-blue-50 to-indigo-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="w-5 h-5 text-blue-600" /> Pro Tip
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{randomTip}</p>
      </CardContent>
    </Card>
  );
}

// Quick Actions
function QuickActions({ navigate }: { navigate: any }) {
  return (
    <Card className="shadow-secondary border-0 bg-card/40 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-lg">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Button
          onClick={() => navigate("/enhancer")}
          className="w-full bg-transparent border border-blue-500 text-blue-600 hover:bg-blue-600 hover:text-white transition-colors"
        >
          <Sparkles className="w-4 h-4 mr-2" /> Enhance Code
        </Button>
        <Button
          onClick={() => navigate("/scanner")}
          className="w-full bg-transparent border border-blue-500 text-blue-600 hover:bg-blue-600 hover:text-white transition-colors"
        >
          <Activity className="w-4 h-4 mr-2" /> Run Security Scan
        </Button>
      </CardContent>
    </Card>
  );
}

