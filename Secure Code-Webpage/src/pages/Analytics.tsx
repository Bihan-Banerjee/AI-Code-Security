import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AxiosError } from "axios";
import api from "@/lib/api";
import {
  LineChart, Line,
  BarChart, Bar,
  AreaChart, Area,
  PieChart, Pie, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ScatterChart, Scatter,
  ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import SecurityHeader from "@/components/SecurityHeader";
import Footer from "@/components/Footer";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface HistoryItem {
  language?: string;
  result?: {
    results?: {
      issue_cwe?: { id?: number };
      issue_severity?: string;
    }[];
  };
  timestamp?: string;
}

interface HistoryData {
  scan: HistoryItem[];
}

const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7f50", "#00c49f", "#0088fe", "#d0ed57"];

function getStoredToken(): string | null {
  return localStorage.getItem("token") || sessionStorage.getItem("token") || null;
}

const fetchHistory = async (): Promise<HistoryItem[]> => {
  const token = getStoredToken();
  if (!token) throw new Error("Not logged in");
  const { data } = await api.get<HistoryData>("/api/history", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.scan || [];
};

export default function Analytics() {
  const navigate = useNavigate();
  const { data: history = [], error } = useQuery<HistoryItem[], AxiosError>({
    queryKey: ["scan-history"],
    queryFn: fetchHistory,
  });

  const [groupBy, setGroupBy] = useState<"CWE" | "Severity" | "Timeline">("CWE");
  const [chartType, setChartType] = useState<
    "Line" | "Bar" | "Pie" | "Area" | "Radar" | "Scatter" | "Composed"
  >("Bar");

  if (error) {
    if (error.response?.status === 401) {
      toast.error("Session expired. Please log in again.");
      navigate("/login");
    } else {
      toast.error(error.message || "Failed to fetch history");
    }
  }

  const chartData = useMemo(() => {
    const cweCounts: Record<string, number> = {};
    const severityCounts: Record<string, number> = {};
    const timelineCounts: Record<string, number> = {};

    for (const item of history) {
      const results = item.result?.results || [];

      if (groupBy === "CWE") {
        results.forEach((r) => {
          const cwe = r.issue_cwe?.id ? `CWE-${r.issue_cwe.id}` : "No CWE";
          cweCounts[cwe] = (cweCounts[cwe] || 0) + 1;
        });
      }

      if (groupBy === "Severity") {
        results.forEach((r) => {
          const sev = r.issue_severity || "UNDEFINED";
          severityCounts[sev] = (severityCounts[sev] || 0) + 1;
        });
      }

      if (groupBy === "Timeline") {
        const date = item.timestamp ? new Date(item.timestamp).toISOString().split("T")[0] : "Unknown";
        timelineCounts[date] = (timelineCounts[date] || 0) + results.length;
      }
    }

    if (groupBy === "CWE")
      return Object.entries(cweCounts).map(([k, v]) => ({ name: k, value: v }));

    if (groupBy === "Severity")
      return Object.entries(severityCounts).map(([k, v]) => ({ name: k, value: v }));

    if (groupBy === "Timeline")
      return Object.entries(timelineCounts).map(([date, v]) => ({ name: date, value: v }));

    return [];
  }, [history, groupBy]);

  const renderChart = () => {
    if (!chartData || chartData.length === 0) {
      return <p className="text-center text-gray-500">No data available</p>;
    }

    try {
      switch (chartType) {
        case "Line":
          return (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="value" stroke="#8884d8" />
              </LineChart>
            </ResponsiveContainer>
          );
        case "Bar":
          return (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          );
        case "Pie":
          return (
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Tooltip />
                <Legend />
                <Pie data={chartData} dataKey="value" nameKey="name" outerRadius={150} label>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          );
        case "Area":
          return (
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#8884d8" fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          );
        case "Radar":
          return (
            <ResponsiveContainer width="100%" height={400}>
              <RadarChart outerRadius={150} data={chartData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="name" />
                <PolarRadiusAxis />
                <Tooltip />
                <Radar name="Issues" dataKey="value" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
              </RadarChart>
            </ResponsiveContainer>
          );
        case "Scatter":
          return (
            <ResponsiveContainer width="100%" height={400}>
              <ScatterChart>
                <CartesianGrid />
                <XAxis type="category" dataKey="name" />
                <YAxis type="number" dataKey="value" />
                <Tooltip />
                <Scatter data={chartData} fill="#82ca9d" />
              </ScatterChart>
            </ResponsiveContainer>
          );
        case "Composed":
          return (
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" barSize={20} fill="#413ea0" />
                <Line type="monotone" dataKey="value" stroke="#ff7300" />
              </ComposedChart>
            </ResponsiveContainer>
          );
        default:
          return null;
      }
    } catch (err) {
      console.error("Chart render failed:", err);
      return <p className="text-red-500">⚠ Chart crashed, check console</p>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <SecurityHeader />
      <div className="p-8 max-w-6xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold">Security Analytics</h1>
        <p className="text-gray-600">Visualize vulnerabilities by CWE, severity, or timeline.</p>

        <div className="flex gap-4 flex-wrap">
          <div>
            <label className="block text-sm font-medium mb-1">Group By</label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as any)}
              className="border rounded-md p-2"
            >
              <option value="CWE">CWE</option>
              <option value="Severity">Severity</option>
              <option value="Timeline">Timeline</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Chart Type</label>
            <select
              value={chartType}
              onChange={(e) => setChartType(e.target.value as any)}
              className="border rounded-md p-2"
            >
              <option value="Line">Line</option>
              <option value="Bar">Bar</option>
              <option value="Pie">Pie</option>
              <option value="Area">Area</option>
              <option value="Radar">Radar</option>
              <option value="Scatter">Scatter</option>
              <option value="Composed">Composed</option>
            </select>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{groupBy} Analysis ({chartType} Chart)</CardTitle>
          </CardHeader>
          <CardContent>{renderChart()}</CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
}
