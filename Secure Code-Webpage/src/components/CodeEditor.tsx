import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, Play, Download, AlertTriangle, CheckCircle, Copy, Shield } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Link } from "react-router-dom";

const CodeEditor = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("input");

  const vulnerableCode = `import sqlite3
import hashlib

def authenticate_user(username, password):
    # SQL Injection vulnerability
    query = f"SELECT * FROM users WHERE username='{username}' AND password='{password}'"
    
    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()
    result = cursor.execute(query).fetchone()
    
    # Hardcoded secret
    SECRET_KEY = "sk-abc123secretkey456"
    
    if result:
        # XSS vulnerability - unescaped output
        return f"<div>Welcome {username}!</div>"`;

  const fixedCode = `import sqlite3
import hashlib
import os
from html import escape

def authenticate_user(username, password):
    # Fixed: Using parameterized queries
    query = "SELECT * FROM users WHERE username=? AND password=?"
    
    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()
    result = cursor.execute(query, (username, password)).fetchone()
    
    # Fixed: Using environment variable
    SECRET_KEY = os.getenv('SECRET_KEY')
    
    if result:
        # Fixed: Proper HTML escaping
        return f"<div>Welcome {escape(username)}!</div>"`;

  const vulnerabilities = [
    {
      type: "SQL Injection",
      severity: "Critical",
      line: 6,
      message: "User input concatenated directly into SQL query without sanitization",
    },
    {
      type: "Hardcoded Secret",
      severity: "High",
      line: 13,
      message: "Sensitive credentials stored in source code",
    },
    {
      type: "XSS Vulnerability",
      severity: "Medium",
      line: 17,
      message: "User input rendered without HTML escaping",
    },
  ];

  const fixes = [
    { title: "SQL Injection Fix", description: "Replaced with parameterized queries" },
    { title: "Secret Management", description: "Moved to environment variable" },
    { title: "XSS Prevention", description: "Added HTML escaping" },
  ];

  const copyCode = (code: string, type: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Copied!",
      description: `${type} code copied to clipboard`,
    });
  };

  return (
    <section id="demo" className="py-20 bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-semibold mb-4">
            <Shield className="w-4 h-4" />
            Interactive Demo
          </div>
          <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            See It In Action
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Paste your code, detect vulnerabilities, and get AI-powered fixes
          </p>
        </div>

        <Card className="shadow-2xl border-2 border-blue-100">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 border-b-2 border-blue-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <Shield className="w-6 h-6 text-blue-600" />
                Code Security Scanner & Enhancer
              </CardTitle>
              <div className="flex gap-2">
                <Link to="/scanner">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Upload className="w-4 h-4" />
                    Upload
                  </Button>
                </Link>
                <Link to="/scanner">
                  <Button size="sm" className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                    <Play className="w-4 h-4" />
                    Scan Code
                  </Button>
                </Link>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-3 bg-gray-100 p-1 rounded-xl">
                <TabsTrigger 
                  value="input"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-lg font-semibold"
                >
                  Vulnerable Code
                </TabsTrigger>
                <TabsTrigger 
                  value="vulnerabilities"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-lg font-semibold"
                >
                  Security Analysis
                </TabsTrigger>
                <TabsTrigger 
                  value="fixed"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-lg font-semibold"
                >
                  Fixed Code
                </TabsTrigger>
              </TabsList>

              <TabsContent value="input" className="space-y-4">
                <div className="relative">
                  <ScrollArea className="h-96 w-full rounded-xl border-2 border-red-200 bg-gray-50">
                    <pre className="p-6 text-sm font-mono">
                      <code className="text-gray-800">{vulnerableCode}</code>
                    </pre>
                  </ScrollArea>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-4 right-4 gap-2"
                    onClick={() => copyCode(vulnerableCode, "Vulnerable")}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="vulnerabilities" className="space-y-4">
                <div className="space-y-4">
                  {vulnerabilities.map((vuln, index) => (
                    <Card 
                      key={index} 
                      className={`border-l-4 ${
                        vuln.severity === "Critical"
                          ? "border-l-red-500 bg-red-50"
                          : vuln.severity === "High"
                          ? "border-l-orange-500 bg-orange-50"
                          : "border-l-yellow-500 bg-yellow-50"
                      }`}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <AlertTriangle className={`w-6 h-6 ${
                              vuln.severity === "Critical"
                                ? "text-red-600"
                                : vuln.severity === "High"
                                ? "text-orange-600"
                                : "text-yellow-600"
                            }`} />
                            <div>
                              <h3 className="text-lg font-bold text-gray-800">{vuln.type}</h3>
                              <p className="text-sm text-gray-600">Line {vuln.line}</p>
                            </div>
                          </div>
                          <Badge
                            variant={vuln.severity === "Critical" ? "destructive" : "secondary"}
                            className="font-semibold"
                          >
                            {vuln.severity}
                          </Badge>
                        </div>
                        <p className="text-gray-700">{vuln.message}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="fixed" className="space-y-4">
                <div className="relative">
                  <ScrollArea className="h-96 w-full rounded-xl border-2 border-green-200 bg-gray-50">
                    <pre className="p-6 text-sm font-mono">
                      <code className="text-gray-800">{fixedCode}</code>
                    </pre>
                  </ScrollArea>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-4 right-4 gap-2"
                    onClick={() => copyCode(fixedCode, "Fixed")}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>

                <div className="grid md:grid-cols-3 gap-4 mt-6">
                  {fixes.map((fix, index) => (
                    <Card key={index} className="border-2 border-green-200 bg-green-50">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <h4 className="font-bold text-gray-800 mb-1">{fix.title}</h4>
                            <p className="text-sm text-gray-600">{fix.description}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default CodeEditor;
