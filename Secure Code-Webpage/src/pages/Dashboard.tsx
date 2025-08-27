import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import SecurityHeader from "@/components/SecurityHeader";
export default function Dashboard() {
  const [history, setHistory] = useState<{ enhance: any[]; scan: any[] }>({ enhance: [], scan: [] });
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
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
          localStorage.removeItem("token");
          navigate("/login");
        } else {
          toast.error(err.response?.data?.error || "Failed to load history");
        }
      });
  }, [navigate]);

  return (
    <div className="p-6 space-y-6">
      <SecurityHeader />
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div>
        <h2 className="text-xl font-semibold">AI Code Enhancer History</h2>
        {history.enhance.length > 0 ? (
          history.enhance.map((h, i) => (
            <div key={i} className="border p-3 mt-2 rounded">
              <p>
                <b>Language:</b> {h.language}
              </p>
              <p>
                <b>Original:</b> {h.code}
              </p>
              <p>
                <b>Enhanced:</b> {h.enhanced_code}
              </p>
            </div>
          ))
        ) : (
          <p className="text-muted-foreground mt-2">No enhancer history yet.</p>
        )}
      </div>

      <div>
        <h2 className="text-xl font-semibold">🛡 Code Scanner History</h2>
        {history.scan.length > 0 ? (
          history.scan.map((h, i) => (
            <div key={i} className="border p-3 mt-2 rounded">
              <p>
                <b>Language:</b> {h.language}
              </p>
              <pre>{JSON.stringify(h.result, null, 2)}</pre>
            </div>
          ))
        ) : (
          <p className="text-muted-foreground mt-2">No scanner history yet.</p>
        )}
      </div>
    </div>
  );
}
