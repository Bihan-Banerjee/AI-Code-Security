import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { AxiosError } from "axios";
import api from "@/lib/api";
import { getToken } from "@/lib/auth";
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ScatterChart, Scatter, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Header from "@/components/layout/Header";
import Footer from "@/components/Footer";
import Reveal from "@/components/effects/Reveal";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

interface HistoryItem {
  language?: string;
  result?: { results?: { issue_cwe?: { id?: number }; issue_severity?: string }[] };
  timestamp?: string;
}
interface HistoryData { scan: HistoryItem[] }

const COLORS = ["#22d3ee", "#8b5cf6", "#34d399", "#fbbf24", "#f87171", "#60a5fa", "#e879f9"];
const AXIS = "#94a3b8";
const GRID = "rgba(148,163,184,0.15)";
const tooltipStyle = { background: "hsl(222 44% 9%)", border: "1px solid hsl(217 33% 17%)", borderRadius: 12, color: "#f1f5f9" };

const fetchHistory = async (): Promise<HistoryItem[]> => {
  if (!getToken()) throw new Error("Not logged in");
  const { data } = await api.get<HistoryData>("/api/history");
  return Array.isArray(data.scan) ? data.scan : [];
};

export default function Analytics() {
  const navigate = useNavigate();
  const { data: history = [], error, isLoading } = useQuery<HistoryItem[], AxiosError>({
    queryKey: ["scan-history"],
    queryFn: fetchHistory,
  });

  const [groupBy, setGroupBy] = useState<"CWE" | "Severity" | "Timeline">("CWE");
  const [chartType, setChartType] = useState<"Line" | "Bar" | "Pie" | "Area" | "Radar" | "Scatter" | "Composed">("Bar");

  useEffect(() => {
    if (!error) return;
    if (error.response?.status === 401) {
      toast.error("Session expired. Please log in again.");
      navigate("/login");
    } else {
      toast.error(error.message || "Failed to fetch history");
    }
  }, [error, navigate]);

  const chartData = useMemo(() => {
    const cwe: Record<string, number> = {}, sev: Record<string, number> = {}, tl: Record<string, number> = {};
    for (const item of history) {
      const results = Array.isArray(item?.result?.results) ? item.result!.results! : [];
      if (groupBy === "CWE") results.forEach((r) => { const k = r.issue_cwe?.id ? `CWE-${r.issue_cwe.id}` : "No CWE"; cwe[k] = (cwe[k] || 0) + 1; });
      if (groupBy === "Severity") results.forEach((r) => { const k = r.issue_severity || "UNDEFINED"; sev[k] = (sev[k] || 0) + 1; });
      if (groupBy === "Timeline") {
        const d = item.timestamp && !isNaN(Date.parse(item.timestamp)) ? new Date(item.timestamp).toISOString().split("T")[0] : "Unknown";
        tl[d] = (tl[d] || 0) + results.length;
      }
    }
    if (groupBy === "CWE") return Object.entries(cwe).map(([name, value]) => ({ name, value }));
    if (groupBy === "Severity") return Object.entries(sev).map(([name, value]) => ({ name, value }));
    return Object.entries(tl).sort(([a], [b]) => a.localeCompare(b)).map(([name, value]) => ({ name, value }));
  }, [history, groupBy]);

  const renderChart = () => {
    if (!chartData.length) return <p className="py-16 text-center text-muted-foreground">No data available</p>;
    const grid = <CartesianGrid strokeDasharray="3 3" stroke={GRID} />;
    const axes = <><XAxis dataKey="name" tick={{ fill: AXIS, fontSize: 12 }} stroke={GRID} /><YAxis tick={{ fill: AXIS, fontSize: 12 }} stroke={GRID} /></>;
    const tip = <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(148,163,184,0.08)" }} />;
    switch (chartType) {
      case "Line":
        return <ResponsiveContainer width="100%" height={400}><LineChart data={chartData}>{grid}{axes}{tip}<Legend /><Line type="monotone" dataKey="value" stroke="#22d3ee" strokeWidth={2} /></LineChart></ResponsiveContainer>;
      case "Bar":
        return <ResponsiveContainer width="100%" height={400}><BarChart data={chartData}>{grid}{axes}{tip}<Legend /><Bar dataKey="value" fill="#22d3ee" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer>;
      case "Pie":
        return <ResponsiveContainer width="100%" height={400}><PieChart>{tip}<Legend /><Pie data={chartData} dataKey="value" nameKey="name" outerRadius={150} label>{chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie></PieChart></ResponsiveContainer>;
      case "Area":
        return <ResponsiveContainer width="100%" height={400}><AreaChart data={chartData}><defs><linearGradient id="cv" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22d3ee" stopOpacity={0.7} /><stop offset="95%" stopColor="#22d3ee" stopOpacity={0} /></linearGradient></defs>{grid}{axes}{tip}<Area type="monotone" dataKey="value" stroke="#22d3ee" fill="url(#cv)" /></AreaChart></ResponsiveContainer>;
      case "Radar":
        return <ResponsiveContainer width="100%" height={400}><RadarChart outerRadius={150} data={chartData}><PolarGrid stroke={GRID} /><PolarAngleAxis dataKey="name" tick={{ fill: AXIS, fontSize: 12 }} /><PolarRadiusAxis tick={{ fill: AXIS }} />{tip}<Radar name="Issues" dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.5} /></RadarChart></ResponsiveContainer>;
      case "Scatter":
        return <ResponsiveContainer width="100%" height={400}><ScatterChart>{grid}<XAxis type="category" dataKey="name" tick={{ fill: AXIS, fontSize: 12 }} stroke={GRID} /><YAxis type="number" dataKey="value" tick={{ fill: AXIS }} stroke={GRID} />{tip}<Scatter data={chartData} fill="#22d3ee" /></ScatterChart></ResponsiveContainer>;
      case "Composed":
        return <ResponsiveContainer width="100%" height={400}><ComposedChart data={chartData}>{grid}{axes}{tip}<Legend /><Bar dataKey="value" barSize={20} fill="#8b5cf6" radius={[6, 6, 0, 0]} /><Line type="monotone" dataKey="value" stroke="#22d3ee" strokeWidth={2} /></ComposedChart></ResponsiveContainer>;
      default:
        return null;
    }
  };

  return (
    <div className="relative min-h-screen bg-background bg-grid">
      <div className="pointer-events-none absolute inset-0 bg-gradient-twilight" />
      <Header />
      <main className="relative mx-auto max-w-6xl space-y-8 px-4 py-12">
        <Reveal>
          <h1 className="font-display text-3xl font-medium sm:text-4xl">Security <span className="text-gradient">analytics</span></h1>
          <p className="mt-2 text-muted-foreground">Visualize vulnerabilities by CWE, severity, or timeline.</p>
        </Reveal>

        <div className="flex flex-wrap gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-muted-foreground">Group by</label>
            <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as typeof groupBy)} className="rounded-lg border border-border/60 bg-card/60 p-2.5 text-foreground">
              <option value="CWE">CWE</option><option value="Severity">Severity</option><option value="Timeline">Timeline</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-muted-foreground">Chart type</label>
            <select value={chartType} onChange={(e) => setChartType(e.target.value as typeof chartType)} className="rounded-lg border border-border/60 bg-card/60 p-2.5 text-foreground">
              {["Line", "Bar", "Pie", "Area", "Radar", "Scatter", "Composed"].map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <Card className="border-border/60 bg-card/40">
          <CardHeader><CardTitle className="font-display">{groupBy} analysis · {chartType} chart</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="mt-3 text-muted-foreground">Loading analytics...</p>
              </div>
            ) : renderChart()}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
