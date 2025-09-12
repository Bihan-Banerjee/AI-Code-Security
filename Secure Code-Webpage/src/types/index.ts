// src/types/index.ts
export type Language = "python" | "javascript";

export type FileBlock = {
  filename: string;
  content: string;
};

export interface BanditIssue {
  code?: string;
  col_offset?: number;
  end_col_offset?: number;
  filename: string;
  issue_confidence?: "HIGH" | "MEDIUM" | "LOW" | "UNDEFINED" | string;
  issue_severity?: "HIGH" | "MEDIUM" | "LOW" | "UNDEFINED" | string;
  issue_text: string;
  line_number?: number;
  line_range?: number[];
  more_info?: string;
  test_id?: string;
  test_name?: string;
}

export interface BanditReport {
  errors: unknown[];
  generated_at?: string;
  metrics?: Record<string, unknown>;
  results: BanditIssue[];
}

export interface SemgrepIssue {
  check_id?: string;
  path?: string;
  line?: number;
  message?: string;
  extra?: any;
}

export interface SemgrepReport {
  results: SemgrepIssue[];
  errors?: unknown[];
}

export type ScanResult = BanditReport | SemgrepReport;

export interface ScanResponse {
  result: ScanResult;
  cached?: boolean;
}

export interface EnhanceResponse {
  enhanced_code: string;
  diff: string;
}

export interface HistoryItem {
  username?: string;
  language?: Language;
  code?: string;
  enhanced_code?: string;
  diff?: string;
  result?: ScanResult;
  timestamp?: string;
}
