import { useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

type FileBlock = {
  filename: string;
  content: string;
};

export default function CodeScanner() {
  const [files, setFiles] = useState<FileBlock[]>([
    { filename: "app.py", content: "" },
  ]);
  const [language, setLanguage] = useState("python");
  const [results, setResults] = useState<string | null>(null);

  const handleFileChange = (index: number, field: "filename" | "content", value: string) => {
    const updated = [...files];
    updated[index][field] = value;
    setFiles(updated);
  };

  const addFile = () => {
    setFiles([...files, { filename: `file${files.length + 1}.py`, content: "" }]);
  };

  const deleteFile = (index: number) => {
    const updated = files.filter((_, i) => i !== index);
    setFiles(updated);
  };

  const handleScan = async () => {
    try {
      const res = await axios.post("/api/scan", {
        files,
        language,
      });
      setResults(res.data.output || JSON.stringify(res.data, null, 2));
    } catch (err: any) {
      setResults(JSON.stringify(err.response?.data || err.message, null, 2));
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">🔍 Code Vulnerability Scanner</h1>

      <Select onValueChange={setLanguage} defaultValue="python">
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Language" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="python">Python</SelectItem>
          <SelectItem value="javascript">JavaScript</SelectItem>
        </SelectContent>
      </Select>

      {files.map((file, index) => (
        <div key={index} className="space-y-2 border p-4 rounded-md">
          <div className="flex items-center gap-4">
            <Label className="text-sm w-20">Filename:</Label>
            <Input
              value={file.filename}
              onChange={(e) =>
                handleFileChange(index, "filename", e.target.value)
              }
              className="flex-1"
            />
            <Button variant="destructive" onClick={() => deleteFile(index)}>
              Delete
            </Button>
          </div>

          <Textarea
            rows={8}
            value={file.content}
            onChange={(e) => handleFileChange(index, "content", e.target.value)}
            placeholder="Paste your code here..."
          />
        </div>
      ))}

      <div className="flex gap-4">
        <Button variant="outline" onClick={addFile}>
          ➕ Add File
        </Button>
        <Button onClick={handleScan}>🚀 Scan Code</Button>
      </div>

      {results && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-2">Results:</h2>
          <Textarea value={results} readOnly rows={10} />
        </div>
      )}
    </div>
  );
}
