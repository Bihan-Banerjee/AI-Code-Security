import { ScanHistoryItem } from "../types";

export function classifyIssue(cweId?: number): string {
  if (!cweId) return "No Issue";
  if (cweId === 89) return "Injection - SQL";
  if (cweId === 78) return "Injection - Command";
  if (cweId === 502) return "Deserialization";
  if (cweId === 327) return "Cryptography";
  if (cweId === 400) return "Reliability / Availability";
  return "Other";
}

export function prepareChartData(history: ScanHistoryItem[]) {
  const groupCounts: Record<string, number> = {};
  const severityCounts: Record<string, number> = {};
  const timeline: { date: string; issues: number }[] = [];

  for (const item of history) {
    const results = item.result.results;
    if (results.length === 0) {
      groupCounts["No Issue"] = (groupCounts["No Issue"] || 0) + 1;
      continue;
    }
    results.forEach(r => {
      const group = classifyIssue(r.issue_cwe?.id);
      groupCounts[group] = (groupCounts[group] || 0) + 1;
      if (r.issue_severity) {
        severityCounts[r.issue_severity] = (severityCounts[r.issue_severity] || 0) + 1;
      }
    });
    timeline.push({
      date: new Date(item.timestamp).toISOString().split("T")[0],
      issues: results.length,
    });
  }

  return { groupCounts, severityCounts, timeline };
}
