import axios, { AxiosInstance, AxiosError } from "axios";

const getApiBaseURL = (): string => {
  // Priority 1: Environment variable from .env files
  if (import.meta.env.VITE_API_BASE) {
    return import.meta.env.VITE_API_BASE;
  }
  
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Priority 2: Auto-detect based on current hostname
  const hostname = window.location.hostname;
  
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    // Development mode - point to local backend
    return "http://localhost:5000/api";
  }
  
  // Priority 3: Production fallback
  // If frontend and backend are on same domain, use relative path
  if (window.location.origin.includes("your-domain.com")) {
    return "/api";
  }
  
  // If backend is on different domain, specify full URL
  return "https://darthbihan-ai-code-security-backend.hf.space";
};

function getToken(): string | null {
  return sessionStorage.getItem("token") ?? localStorage.getItem("token") ?? null;
}

const api: AxiosInstance = axios.create({
  baseURL: getApiBaseURL(),
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 60_000, // 60 seconds
  withCredentials: false, 
});

api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers = config.headers ?? {};
      (config.headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
    }
    
    if (import.meta.env.DEV) {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
      console.log("Base URL:", api.defaults.baseURL);
      if (config.data) {
        console.log("Request Data:", config.data);
      }
    }
    
    return config;
  },
  (error) => {
    console.error("[API Request Error]", error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV) {
      console.log(`[API Response] ${response.config.url}`, response.status);
      console.log("Response Data:", response.data);
    }
    return response;
  },
  (error: AxiosError) => {
    // Handle specific HTTP status codes
    if (error.response?.status === 401) {
      // Unauthorized - clear tokens and redirect to login
      console.warn("[API] Unauthorized - clearing tokens");
      sessionStorage.removeItem("token");
      localStorage.removeItem("token");
      
      // Don't redirect if already on login/register page
      if (!window.location.pathname.includes("/login") && 
          !window.location.pathname.includes("/register")) {
        window.location.href = "/login";
      }
    } else if (error.response?.status === 403) {
      console.error("[API] Forbidden - insufficient permissions");
    } else if (error.response?.status === 404) {
      console.error("[API] Not Found -", error.config?.url);
    } else if (error.response?.status === 500) {
      console.error("[API] Server Error");
    } else if (error.code === "ECONNABORTED") {
      console.error("[API] Request Timeout");
    } else if (error.code === "ERR_NETWORK") {
      console.error("[API] Network Error - Backend may be down");
    }
    
    // Detailed error logging in development
    if (import.meta.env.DEV) {
      console.error("[API Error Details]", {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
      });
    }
    
    return Promise.reject(error);
  }
);

export type FileBlock = { 
  filename: string; 
  content: string;
};

export interface BanditIssue {
  code?: string;
  col_offset?: number;
  end_col_offset?: number;
  filename?: string;
  issue_confidence?: string;
  issue_cwe?: { 
    id?: number; 
    link?: string;
  } | null;
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
  candidates?: Array<{
    model: string;
    code: string;
  }>;
  explanations?: Array<{
    change: string;
    reason: string;
  }>;
}

export const getCurrentApiUrl = (): string => {
  return api.defaults.baseURL || "";
};

export const isDevelopment = (): boolean => {
  return import.meta.env.DEV;
};

export const isProduction = (): boolean => {
  return import.meta.env.PROD;
};

export const getEnvironment = (): string => {
  return import.meta.env.MODE || "development";
};

export const checkApiHealth = async (): Promise<boolean> => {
  try {
    const response = await api.get("/health");
    console.log("[API Health Check]", response.data);
    return true;
  } catch (error) {
    console.error("[API Health Check Failed]", error);
    return false;
  }
};

export const logApiConfig = (): void => {
  if (isDevelopment()) {
    console.group("[API Configuration]");
    console.log("Base URL:", getCurrentApiUrl());
    console.log("Environment:", getEnvironment());
    console.log("Hostname:", window.location.hostname);
    console.log("Origin:", window.location.origin);
    console.log("Token Present:", !!getToken());
    console.groupEnd();
  }
};

export default api;
