// src/components/ScanResultsTable.tsx
import React from "react";
import { z } from "zod";
import { BanditItem } from "@/lib/schemas";

type Issue = z.infer<typeof BanditItem>;

function getSeverityColor(severity?: string) {
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
}

export default function ScanResultsTable({ issues }: { issues: Issue[] }) {
  if (!issues || issues.length === 0) {
    return <p className="mt-4 text-green-700">No vulnerabilities found. Your code is secure!</p>;
  }

  return (
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
              <td className={`p-2 border ${getSeverityColor(issue.issue_severity)}`}>
                {issue.issue_severity || "-"}
              </td>
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
  );
}
