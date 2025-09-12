// src/lib/api.ts
import axios, { AxiosInstance } from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

function getToken(): string | null {
  // we store token in sessionStorage in this project (so closing browser logs out)
  return sessionStorage.getItem("token") ?? null;
}

const api: AxiosInstance = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 60_000,
});

// request interceptor to add token
api.interceptors.request.use((cfg) => {
  const token = getToken();
  if (token) {
    cfg.headers = cfg.headers ?? {};
    // Bearer token required by backend
    // axios typings allow string | undefined
    (cfg.headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }
  return cfg;
});

export type FileBlock = { filename: string; content: string };

export interface BanditIssue {
  code?: string;
  col_offset?: number;
  end_col_offset?: number;
  filename?: string;
  issue_confidence?: string;
  issue_cwe?: { id?: number; link?: string } | null;
  issue_severity?: string;
  issue_text?: string;
  line_number?: number;
  line_range?: number[];
  more_info?: string;
  test_id?: string;
  test_name?: string;
}

export interface ScanResult {
  results?: BanditIssue[];
  metrics?: any;
  errors?: any[];
  generated_at?: string;
}

export interface ScanResponse {
  result?: ScanResult;
  cached?: boolean;
}

export interface EnhanceResponse {
  enhanced_code: string;
  diff: string;
}

export default api;
