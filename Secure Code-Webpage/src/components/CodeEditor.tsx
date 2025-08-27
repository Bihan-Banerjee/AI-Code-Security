import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, Play, Download, AlertTriangle, CheckCircle, Copy } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

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
        return f"<h1>Welcome {username}!</h1>"
    return None`;

  const fixedCode = `import sqlite3
import hashlib
import html
from cryptography.fernet import Fernet
import os

def authenticate_user(username, password):
    # Fixed: Using parameterized queries to prevent SQL injection
    query = "SELECT * FROM users WHERE username=? AND password=?"
    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()
    
    # Hash the password before comparison
    hashed_password = hashlib.sha256(password.encode()).hexdigest()
    result = cursor.execute(query, (username, hashed_password)).fetchone()
    
    # Fixed: Use environment variable for secret
    SECRET_KEY = os.getenv('SECRET_KEY')
    if not SECRET_KEY:
        raise ValueError("SECRET_KEY environment variable not set")
    
    if result:
        # Fixed: Escape HTML to prevent XSS
        safe_username = html.escape(username)
        return f"<h1>Welcome {safe_username}!</h1>"
    return None`;

  const vulnerabilities = [
    {
      line: 5,
      type: "SQL Injection",
      severity: "critical",
      message: "Direct string concatenation in SQL query allows injection attacks"
    },
    {
      line: 11,
      type: "Hardcoded Secret",
      severity: "critical", 
      message: "Secret key exposed in source code"
    },
    {
      line: 15,
      type: "XSS Vulnerability",
      severity: "high",
      message: "Unescaped user input in HTML output"
    }
  ];

  const handleScan = () => {
    setActiveTab("results");
    toast({
      title: "Security Scan Complete",
      description: "Found 3 vulnerabilities in your code",
    });
  };

  const handleFix = () => {
    setActiveTab("fixed");
    toast({
      title: "AI Fixes Applied",
      description: "All vulnerabilities have been automatically fixed",
    });
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Code Copied",
      description: "Code has been copied to clipboard",
    });
  };

  return (
    <section className="py-16 px-4 bg-muted/30">
      <div className="container mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-2">AI Code Security Enhancer</h2>
          <p className="text-muted-foreground">Paste your code, detect vulnerabilities, and get AI-powered fixes</p>
        </div>

        <div className="max-w-6xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="input">Input Code</TabsTrigger>
              <TabsTrigger value="results">Security Analysis</TabsTrigger>
              <TabsTrigger value="fixed">Fixed Code</TabsTrigger>
            </TabsList>

            <TabsContent value="input">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Code Input
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Paste your code here for security analysis..."
                    className="min-h-[400px] font-mono text-sm"
                    defaultValue={vulnerableCode}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="results">
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <AlertTriangle className="h-5 w-5 mr-2 text-destructive" />
                      Detected Vulnerabilities
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-4">
                        {vulnerabilities.map((vuln, index) => (
                          <div key={index} className="p-4 border rounded-lg space-y-2">
                            <div className="flex items-center justify-between">
                              <Badge variant={vuln.severity === "critical" ? "destructive" : "warning"}>
                                {vuln.severity.toUpperCase()}
                              </Badge>
                              <span className="text-sm text-muted-foreground">Line {vuln.line}</span>
                            </div>
                            <h4 className="font-semibold">{vuln.type}</h4>
                            <p className="text-sm text-muted-foreground">{vuln.message}</p>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Original Code</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px]">
                      <pre className="text-sm bg-muted p-4 rounded-lg overflow-x-auto">
                        <code>{vulnerableCode}</code>
                      </pre>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="fixed">
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <CheckCircle className="h-5 w-5 mr-2 text-success" />
                      Security Fixes Applied
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-4">
                        <div className="p-4 border border-success/20 bg-success/5 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="success">FIXED</Badge>
                            <span className="text-sm text-muted-foreground">Lines 5-6</span>
                          </div>
                          <h4 className="font-semibold">SQL Injection</h4>
                          <p className="text-sm text-muted-foreground">Replaced with parameterized queries</p>
                        </div>
                        <div className="p-4 border border-success/20 bg-success/5 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="success">FIXED</Badge>
                            <span className="text-sm text-muted-foreground">Line 11</span>
                          </div>
                          <h4 className="font-semibold">Hardcoded Secret</h4>
                          <p className="text-sm text-muted-foreground">Moved to environment variable</p>
                        </div>
                        <div className="p-4 border border-success/20 bg-success/5 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="success">FIXED</Badge>
                            <span className="text-sm text-muted-foreground">Line 15</span>
                          </div>
                          <h4 className="font-semibold">XSS Vulnerability</h4>
                          <p className="text-sm text-muted-foreground">Added HTML escaping</p>
                        </div>
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      Secured Code
                      <Badge variant="success">Security Score: A+</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px]">
                      <pre className="text-sm bg-muted p-4 rounded-lg overflow-x-auto">
                        <code>{fixedCode}</code>
                      </pre>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </section>
  );
};

export default CodeEditor;