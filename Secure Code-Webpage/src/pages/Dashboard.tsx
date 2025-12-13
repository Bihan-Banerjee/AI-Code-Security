import { useState } from "react";
import { AxiosError } from "axios";
import api from "@/lib/api";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import SecurityHeader from "@/components/SecurityHeader";
import Footer from "@/components/Footer";
import ScanResultsTable from "@/components/ScanResultsTable";
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
  ChartColumn,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface Candidate {
  model: string;
  code: string;
}

interface Explanation {
  change: string;
  reason: string;
}

interface HistoryItem {
  language?: string;
  code?: string;
  enhanced_code?: string;
  result?: any;
  timestamp?: string;
  candidates?: Candidate[];
  explanations?: Explanation[];
}

interface HistoryData {
    enhance: HistoryItem[];
    scan: HistoryItem[];
}

const ITEMS_PER_PAGE = 5;

function getStoredToken(): string | null {
  return localStorage.getItem("token") || sessionStorage.getItem("token") || null;
}

function removeStoredToken() {
  localStorage.removeItem("token");
  sessionStorage.removeItem("token");
}

const fetchHistory = async (): Promise<HistoryData> => {
    const token = getStoredToken();
    if (!token) {
        throw new Error("You must be logged in to view the dashboard.");
    }
    const { data } = await api.get("/api/history", {
        headers: { Authorization: `Bearer ${token}` },
    });
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
        queryKey: ['history'],
        queryFn: fetchHistory,
    });

    if (error) {
        if (error.response?.status === 401) {
            toast.error("Session expired. Please log in again.");
            removeStoredToken();
            navigate("/login");
        } else {
            toast.error(
              typeof error.response?.data === "object" && error.response?.data !== null && "error" in error.response.data
                ? (error.response.data as { error?: string }).error || "Failed to load history"
                : "Failed to load history"
            );
        }
    }

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
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-purple-50">
      <SecurityHeader />

      <div className="p-8 max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4 animate-fade-in">
          <h1 className="text-5xl font-bold tracking-tight">
            Your{" "}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Security Dashboard
            </span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Monitor your code enhancements and security scans in one place.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <StatsCard
            icon={<Code2 className="w-6 h-6" />}
            title="Enhancements"
            value={history?.enhance?.length || 0}
            gradient="from-blue-500 to-blue-600"
          />
          <StatsCard
            icon={<ShieldCheck className="w-6 h-6" />}
            title="Security Scans"
            value={history?.scan?.length || 0}
            gradient="from-purple-500 to-purple-600"
          />
          <StatsCard
            icon={<TrendingUp className="w-6 h-6" />}
            title="Total Actions"
            value={(history?.enhance?.length || 0) + (history?.scan?.length || 0)}
            gradient="from-green-500 to-emerald-600"
          />
        </div>

        {/* Extra Components */}
        <div className="grid md:grid-cols-3 gap-6 mt-10">
          <ActivityFeed history={history} />
          <TipsCard />
          <QuickActions navigate={navigate} />
        </div>

        {/* Main Content */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="p-4 rounded-full bg-blue-100 animate-pulse">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
            <p className="text-gray-600 font-medium">Loading your dashboard...</p>
          </div>
        ) : error ? (
            <div className="text-center text-red-500">
                <p>{error.message}</p>
            </div>
        ) : (
          <Tabs defaultValue="enhancer" className="w-full animate-slide-up">
            <TabsList className="grid w-full grid-cols-2 rounded-2xl p-1 bg-white shadow-lg border-2 border-blue-100">
              <TabsTrigger
                value="enhancer"
                className="group flex gap-2 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 font-semibold hover:scale-105 hover:shadow-md"
              >
                <Sparkles className="w-4 h-4 group-hover:animate-spin" />
                Enhancement History
              </TabsTrigger>
              <TabsTrigger
                value="scanner"
                className="group flex gap-2 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 font-semibold hover:scale-105 hover:shadow-md"
              >
                <Activity className="w-4 h-4 group-hover:animate-pulse" />
                Security Scans
              </TabsTrigger>
            </TabsList>

            {/* Enhancer List */}
            <TabsContent value="enhancer" className="mt-8">
              {history?.enhance && history.enhance.length > 0 ? (
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
                  gradient="from-blue-500 to-blue-600"
                />
              )}
            </TabsContent>

            {/* Scanner List */}
            <TabsContent value="scanner" className="mt-8">
              {history?.scan && history.scan.length > 0 ? (
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
                  gradient="from-purple-500 to-purple-600"
                />
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Popup for Expanded Details */}
      <Dialog open={!!selectedItem} onOpenChange={closeDetails}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-blue-50 to-purple-50">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {selectedType === "enhancer" ? "Code Enhancement Details" : "Security Scan Results"}
            </DialogTitle>
            <DialogDescription className="text-gray-600 font-medium">
              {selectedItem?.language?.toUpperCase() || "Unknown"} |{" "}
              {selectedItem?.timestamp ? new Date(selectedItem.timestamp).toLocaleString() : "No time"}
            </DialogDescription>
          </DialogHeader>

          {/* Enhancer Details */}
          {selectedType === "enhancer" && selectedItem && (
            <div className="grid gap-8">
              {/* Original */}
              <CodeBlock
                title="Original Code"
                code={selectedItem.code ?? ""}
                variant="original"
                onCopy={handleCopy}
                copySuccess={copySuccess}
                copyId="original-expanded"
              />

              {/* Primary Enhanced */}
              <CodeBlock
                title="Enhanced Code (Primary)"
                code={selectedItem.enhanced_code ?? ""}
                variant="enhanced"
                onCopy={handleCopy}
                copySuccess={copySuccess}
                copyId="enhanced-expanded"
              />

              {Array.isArray(selectedItem.candidates) && selectedItem.candidates.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-lg flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-blue-500" />
                    Alternative Suggestions
                  </h4>
                  <div className="grid gap-4">
                    {selectedItem.candidates.map((c, i) => (
                      <CodeBlock
                        key={i}
                        title={`Candidate #${i + 1} (${c.model})`}
                        code={c.code}
                        variant="enhanced"
                        onCopy={handleCopy}
                        copySuccess={copySuccess}
                        copyId={`candidate-${i}`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {Array.isArray(selectedItem.explanations) && selectedItem.explanations.length > 0 && (
                <div className="space-y-2 bg-green-50 p-4 rounded-xl border-2 border-green-200">
                  <h4 className="font-semibold text-lg flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-green-600" />
                    Security Explanations
                  </h4>
                  <ul className="list-disc list-inside text-sm text-gray-700 space-y-2">
                    {selectedItem.explanations.map((exp, i) => (
                      <li key={i}><strong>{exp.change}:</strong> {exp.reason}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Scanner Details */}
          {selectedType === "scanner" && selectedItem && (
            <div className="rounded-lg bg-white p-4 shadow-md border-2 border-purple-200">
              <ScanResultsTable issues={Array.isArray(selectedItem.result?.results) ? selectedItem.result.results : []} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}

function StatsCard({ icon, title, value, gradient }: { icon: React.ReactNode; title: string; value: number; gradient: string }) {
  return (
    <Card className="group hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 border-2 border-gray-200 bg-white">
      <CardContent className="p-6 flex items-center justify-between">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-600">{title}</p>
          <p className="text-4xl font-bold text-gray-800">{value}</p>
        </div>
        <div className={`p-4 rounded-xl bg-gradient-to-r ${gradient} text-white shadow-lg group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

function ListView({ data, type, onOpen }: { data: HistoryItem[]; type: "enhancer" | "scanner"; onOpen: (item: HistoryItem, type: "enhancer" | "scanner") => void }) {
  return (
    <div className="border-2 border-gray-200 rounded-xl divide-y bg-white shadow-lg overflow-hidden">
      {data.map((item, idx) => (
        <div
          key={idx}
          className="flex justify-between items-center p-4 cursor-pointer hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-200"
          onClick={() => onOpen(item, type)}
        >
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-lg bg-gradient-to-r ${type === "enhancer" ? "from-blue-500 to-blue-600" : "from-purple-500 to-purple-600"} shadow-md`}>
              {type === "enhancer" ? <Sparkles className="w-5 h-5 text-white" /> : <Activity className="w-5 h-5 text-white" />}
            </div>
            <div>
              <p className="font-bold text-gray-800">
                {item.language?.toUpperCase() || "Unknown"} {type === "enhancer" ? "Enhancement" : "Security Scan"}
              </p>
              <p className="text-sm text-gray-600 font-medium">
                {item.timestamp ? new Date(item.timestamp).toLocaleString() : "Unknown time"}
              </p>
            </div>
          </div>
          <span className="text-sm text-blue-600 font-semibold hover:text-purple-600 transition-colors">
            View Details →
          </span>
        </div>
      ))}
    </div>
  );
}

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
        className="border-2 border-blue-200 hover:bg-blue-50 font-semibold"
      >
        Previous
      </Button>
      {pages.map((p) => (
        <Button
          key={p}
          size="sm"
          className={`rounded-full w-10 h-10 font-bold ${
            p === currentPage 
              ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg" 
              : "bg-white border-2 border-gray-200 text-gray-700 hover:border-blue-300"
          }`}
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
        className="border-2 border-blue-200 hover:bg-blue-50 font-semibold"
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
        <h4 className="font-bold text-lg flex items-center gap-2">
          {isEnhanced ? <Sparkles className="w-5 h-5 text-green-600" /> : <Code2 className="w-5 h-5 text-gray-600" />}
          {title}
        </h4>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onCopy(code, copyId)}
          className="border-2 border-gray-300 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all duration-200 font-semibold"
        >
          {copySuccess === copyId ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
          {copySuccess === copyId ? " Copied" : " Copy"}
        </Button>
      </div>
      <div className={`rounded-xl overflow-hidden border-2 ${isEnhanced ? "border-green-200 bg-green-50" : "border-gray-200 bg-gray-50"}`}>
        <div className="overflow-y-auto max-h-96 p-6">
          <pre className="text-sm font-mono leading-relaxed whitespace-pre text-gray-800">
            {code || "// No code available"}
          </pre>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ icon, title, description, gradient }: { icon: React.ReactNode; title: string; description: string; gradient: string }) {
  return (
    <Card className="border-2 border-gray-200 shadow-xl bg-white">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-6">
        <div className={`p-6 rounded-2xl bg-gradient-to-r ${gradient} text-white shadow-lg animate-pulse`}>
          {icon}
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-bold text-gray-800">{title}</h3>
          <p className="text-gray-600 max-w-md leading-relaxed">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ActivityFeed({ history }: { history: HistoryData | undefined }) {
  const allHistory = [...(history?.enhance || []), ...(history?.scan || [])]
    .sort((a, b) => (new Date(b.timestamp || "").getTime() - new Date(a.timestamp || "").getTime()))
    .slice(0, 3); // Limited to 3 items

  return (
    <Card className="group shadow-lg border-2 border-blue-200 bg-white hover:shadow-2xl hover:-translate-y-1 hover:border-blue-400 transition-all duration-300">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-600 group-hover:animate-pulse" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {allHistory.length === 0 ? (
          <p className="text-gray-600 text-sm py-2">No activity yet</p>
        ) : (
          allHistory.map((item, idx) => (
            <div key={idx} className="flex items-center gap-3 text-sm p-2 rounded-lg hover:bg-blue-50 transition-all duration-200 hover:scale-105 cursor-pointer">
              <div className={`p-2 rounded-lg bg-gradient-to-r ${item.enhanced_code ? "from-blue-500 to-blue-600" : "from-purple-500 to-purple-600"} text-white shadow-md`}>
                {item.enhanced_code ? <Sparkles className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-800">{item.language?.toUpperCase() || "Unknown"} {item.enhanced_code ? "Enhancement" : "Scan"}</p>
                <p className="text-xs text-gray-600">{new Date(item.timestamp || "").toLocaleString()}</p>
              </div>
            </div>
          ))
        )}
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
  const randomTip = tips[Math.floor(Math.random() * tips.length)];

  return (
    <Card className="group shadow-lg border-2 border-purple-200 bg-gradient-to-br from-blue-50 to-purple-50 hover:shadow-2xl hover:-translate-y-1 hover:border-purple-400 transition-all duration-300">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-bold">
          <Sparkles className="w-5 h-5 text-purple-600 group-hover:animate-spin" /> Pro Tip
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-gray-700 font-medium leading-relaxed">{randomTip}</p>
      </CardContent>
    </Card>
  );
}

function QuickActions({ navigate }: { navigate: (path: string) => void }) {
  return (
    <Card className="group shadow-lg border-2 border-green-200 bg-white hover:shadow-2xl hover:-translate-y-1 hover:border-green-400 transition-all duration-300">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-green-600 group-hover:rotate-12 transition-transform" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pt-0">
        <Button
          onClick={() => navigate("/enhancer")}
          className="group w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold shadow-md hover:shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95"
        >
          <Sparkles className="w-4 h-4 mr-2 group-hover:animate-spin" /> Enhance Code
        </Button>
        <Button
          onClick={() => navigate("/scanner")}
          className="group w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold shadow-md hover:shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95"
        >
          <Activity className="w-4 h-4 mr-2 group-hover:animate-pulse" /> Run Security Scan
        </Button>
        <Button
          onClick={() => navigate("/analytics")}
          className="group w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold shadow-md hover:shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95"
        >
          <ChartColumn className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" /> Analyze Vulnerabilities
        </Button>
      </CardContent>
    </Card>
  );
}
