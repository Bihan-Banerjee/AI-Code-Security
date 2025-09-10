import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import SecurityHeader from "@/components/SecurityHeader";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { 
  Code2, 
  ShieldCheck, 
  Loader2, 
  Copy, 
  CheckCircle2, 
  Activity,
  Sparkles,
  TrendingUp
} from "lucide-react";

interface HistoryItem {
  language?: string;
  code?: string;
  enhanced_code?: string;
  result?: any;
  timestamp?: string;
}

export default function Dashboard() {
  const [history, setHistory] = useState<{ enhance: HistoryItem[]; scan: HistoryItem[] }>({
    enhance: [],
    scan: [],
  });
  const [loading, setLoading] = useState(true);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    if (!token) {
      toast.error("You must be logged in to view the dashboard.");
      navigate("/login");
      return;
    }

    axios
      .get("/api/history", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setHistory(res.data))
      .catch((err) => {
        if (err.response?.status === 401) {
          toast.error("Session expired. Please log in again.");
          sessionStorage.removeItem("token");
          navigate("/login");
        } else {
          toast.error(err.response?.data?.error || "Failed to load history");
        }
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  const handleCopy = (code: string, type: string) => {
    navigator.clipboard.writeText(code || "");
    setCopySuccess(type);
    toast.success("Code copied to clipboard!");
    setTimeout(() => setCopySuccess(null), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <SecurityHeader />

      <div className="p-8 max-w-6xl mx-auto space-y-8">
        {/* Enhanced Header Section */}
        <div className="space-y-6 animate-fade-in">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold tracking-tight">
              Welcome back to your{" "}
              <span className="bg-gradient-to-r from-blue-500 to-blue-700 bg-clip-text text-transparent">
                Dashboard
              </span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Monitor your code enhancement history and security scan results in one elegant interface
            </p>
          </div>

          {/* Stats Cards */}
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
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="p-4 rounded-full bg-primary/10 animate-glow">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
            <p className="text-muted-foreground">Loading your dashboard...</p>
          </div>
        ) : (
          <div className="animate-slide-up">
            <Tabs defaultValue="enhancer" className="w-full">
              <TabsList className="grid w-full grid-cols-2 rounded-2xl p-1 bg-card/50 backdrop-blur-sm border shadow-secondary">
                <TabsTrigger 
                  value="enhancer" 
                  className="flex gap-2 rounded-xl data-[state=active]:bg-gradient-primary data-[state=active]:text-white data-[state=active]:shadow-glow transition-all duration-300"
                >
                  <Sparkles className="w-4 h-4" /> 
                  Enhancement History
                </TabsTrigger>
                <TabsTrigger 
                  value="scanner" 
                  className="flex gap-2 rounded-xl data-[state=active]:bg-gradient-secondary data-[state=active]:text-white data-[state=active]:shadow-glow transition-all duration-300"
                >
                  <Activity className="w-4 h-4" /> 
                  Security Scans
                </TabsTrigger>
              </TabsList>

              <TabsContent value="enhancer" className="mt-8">
                {history.enhance.length > 0 ? (
                  <HistoryList 
                    data={history.enhance} 
                    type="enhancer" 
                    onCopy={handleCopy}
                    copySuccess={copySuccess}
                  />
                ) : (
                  <EmptyState
                    icon={<Sparkles className="w-8 h-8" />}
                    title="No enhancements yet"
                    description="Your AI-enhanced code will appear here. Start improving your code with our intelligent enhancement tools."
                    gradient="bg-gradient-primary"
                  />
                )}
              </TabsContent>

              <TabsContent value="scanner" className="mt-8">
                {history.scan.length > 0 ? (
                  <HistoryList 
                    data={history.scan} 
                    type="scanner" 
                    onCopy={handleCopy}
                    copySuccess={copySuccess}
                  />
                ) : (
                  <EmptyState
                    icon={<Activity className="w-8 h-8" />}
                    title="No security scans yet"
                    description="Your security analysis results will appear here. Run comprehensive scans to identify vulnerabilities."
                    gradient="bg-gradient-secondary"
                  />
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
       <Footer />
    </div>
  );
}

// Enhanced Stats Card Component
function StatsCard({ 
  icon, 
  title, 
  value, 
  gradient 
}: { 
  icon: React.ReactNode; 
  title: string; 
  value: number; 
  gradient: string;
}) {
  return (
    <Card className="hover-lift border-0 shadow-secondary bg-card/50 backdrop-blur-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold">{value}</p>
          </div>
          <div className={`p-3 rounded-xl ${gradient} text-white shadow-glow`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Enhanced History List Component
function HistoryList({ 
  data, 
  type, 
  onCopy, 
  copySuccess 
}: { 
  data: HistoryItem[]; 
  type: "enhancer" | "scanner";
  onCopy: (code: string, type: string) => void;
  copySuccess: string | null;
}) {
  return (
    <div className="space-y-6">
      {data.map((item, index) => (
        <Card 
          key={index} 
          className="hover-lift border-0 shadow-secondary bg-card/50 backdrop-blur-sm overflow-hidden"
        >
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${type === 'enhancer' ? 'bg-gradient-primary' : 'bg-gradient-secondary'}`}>
                  {type === 'enhancer' ? 
                    <Sparkles className="w-4 h-4 text-white" /> : 
                    <Activity className="w-4 h-4 text-white" />
                  }
                </div>
                <span className="text-lg">
                  {item.language?.toUpperCase() || "Unknown"} {type === "enhancer" ? "Enhancement" : "Security Scan"}
                </span>
              </div>
              {item.timestamp && (
                <span className="text-sm text-muted-foreground">
                  {new Date(item.timestamp).toLocaleDateString()}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {type === "enhancer" ? (
              <div className="grid gap-6">
                <CodeBlock
                  title="Original Code"
                  code={item.code || ""}
                  variant="original"
                  onCopy={onCopy}
                  copySuccess={copySuccess}
                  copyId={`original-${index}`}
                />
                <CodeBlock
                  title="Enhanced Code"
                  code={item.enhanced_code || ""}
                  variant="enhanced"
                  onCopy={onCopy}
                  copySuccess={copySuccess}
                  copyId={`enhanced-${index}`}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <h4 className="font-semibold text-lg flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-success" />
                  Security Analysis Results
                </h4>
                <div className="rounded-xl gradient-code overflow-hidden">
                  <div className="scroll-container overflow-y-auto max-h-96 p-6">
                    <pre className="text-sm font-mono leading-relaxed whitespace-pre-wrap text-black">
                      {JSON.stringify(item.result, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Enhanced Code Block Component
function CodeBlock({ 
  title, 
  code, 
  variant, 
  onCopy, 
  copySuccess, 
  copyId 
}) {
  const isEnhanced = variant === 'enhanced';
  
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h4 className="font-semibold flex items-center gap-2">
          {isEnhanced ? (
            <>
              <Sparkles className="w-4 h-4 text-success" />
              {title}
            </>
          ) : (
            <>
              <Code2 className="w-4 h-4 text-muted-foreground" />
              {title}
            </>
          )}
        </h4>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onCopy(code, copyId)}
          className="hover:bg-primary hover:text-primary-foreground transition-all duration-200"
        >
          {copySuccess === copyId ? (
            <CheckCircle2 className="w-4 h-4 text-success" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </Button>
      </div>
      
      <div className={`rounded-xl overflow-hidden ${
        isEnhanced ? 'code-enhanced' : 'code-original'
      }`}>
        <div className={`overflow-y-auto max-h-96 p-6 ${
          isEnhanced ? 'scroll-visible-dark' : 'scroll-visible'
        }`}>
          <pre className="text-sm font-mono leading-relaxed whitespace-pre">
            {code || "// No code available"}
          </pre>
        </div>
      </div>
    </div>
  );
}

// Enhanced Empty State Component
function EmptyState({
  icon,
  title,
  description,
  gradient,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  gradient: string;
}) {
  return (
    <Card className="border-0 shadow-secondary bg-card/30 backdrop-blur-sm">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-6">
        <div className={`p-6 rounded-2xl ${gradient} text-white shadow-glow animate-float`}>
          {icon}
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-semibold">{title}</h3>
          <p className="text-muted-foreground max-w-md leading-relaxed">
            {description}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
