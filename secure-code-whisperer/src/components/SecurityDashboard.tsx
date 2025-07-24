import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, CheckCircle, XCircle, Activity, Download, RefreshCw } from "lucide-react";

const SecurityDashboard = () => {
  const vulnerabilities = [
    {
      id: 1,
      type: "SQL Injection",
      severity: "High",
      file: "user_auth.py",
      line: 42,
      status: "Fixed",
      description: "Unsafe SQL query construction with user input"
    },
    {
      id: 2,
      type: "XSS Vulnerability",
      severity: "Medium",
      file: "template.html",
      line: 15,
      status: "Pending",
      description: "Unescaped user input in HTML template"
    },
    {
      id: 3,
      type: "Hardcoded Secrets",
      severity: "Critical",
      file: "config.js",
      line: 8,
      status: "Fixed",
      description: "API key exposed in source code"
    },
    {
      id: 4,
      type: "Buffer Overflow",
      severity: "High",
      file: "memory.c",
      line: 127,
      status: "Analyzing",
      description: "Potential buffer overflow in string handling"
    }
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "Critical": return "destructive";
      case "High": return "warning";
      case "Medium": return "secondary";
      default: return "outline";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Fixed": return <CheckCircle className="h-4 w-4 text-success" />;
      case "Pending": return <AlertTriangle className="h-4 w-4 text-warning" />;
      case "Analyzing": return <Activity className="h-4 w-4 text-primary animate-pulse" />;
      default: return <XCircle className="h-4 w-4 text-destructive" />;
    }
  };

  return (
    <section className="py-16 px-4">
      <div className="container mx-auto">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Security Analysis Dashboard</h2>
          <p className="text-muted-foreground">Monitor and manage your code security issues in real-time</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="border-l-4 border-l-destructive">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
              <XCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">1</div>
              <p className="text-xs text-muted-foreground">-2 from last scan</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-warning">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">High Priority</CardTitle>
              <AlertTriangle className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">2</div>
              <p className="text-xs text-muted-foreground">+1 from last scan</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-success">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fixed Issues</CardTitle>
              <CheckCircle className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">2</div>
              <p className="text-xs text-muted-foreground">+2 this week</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-primary">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Security Score</CardTitle>
              <Activity className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">B+</div>
              <Progress value={78} className="mt-2" />
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="vulnerabilities" className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="vulnerabilities">Vulnerabilities</TabsTrigger>
              <TabsTrigger value="fixes">AI Fixes</TabsTrigger>
              <TabsTrigger value="reports">Reports</TabsTrigger>
            </TabsList>
            
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button variant="security" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Re-scan
              </Button>
            </div>
          </div>

          <TabsContent value="vulnerabilities">
            <Card>
              <CardHeader>
                <CardTitle>Detected Vulnerabilities</CardTitle>
                <CardDescription>
                  Security issues found during the latest code analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {vulnerabilities.map((vuln) => (
                    <div key={vuln.id} className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-start space-x-3">
                        {getStatusIcon(vuln.status)}
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-semibold">{vuln.type}</h4>
                            <Badge variant={getSeverityColor(vuln.severity)}>{vuln.severity}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{vuln.description}</p>
                          <div className="text-xs text-muted-foreground">
                            {vuln.file}:{vuln.line}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm">View</Button>
                        {vuln.status === "Fixed" ? (
                          <Button variant="success" size="sm">Applied</Button>
                        ) : (
                          <Button variant="security" size="sm">Fix</Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fixes">
            <Card>
              <CardHeader>
                <CardTitle>AI-Generated Fixes</CardTitle>
                <CardDescription>
                  Automated security fixes suggested by our AI model
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">2 Fixes Applied Successfully</h3>
                  <p className="text-muted-foreground">View detailed fix reports in the Reports tab</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle>Security Reports</CardTitle>
                <CardDescription>
                  Comprehensive analysis and audit reports
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-semibold">Weekly Security Audit</h4>
                      <p className="text-sm text-muted-foreground">Generated 2 hours ago</p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Download PDF
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-semibold">Vulnerability Assessment</h4>
                      <p className="text-sm text-muted-foreground">Generated 1 day ago</p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Download PDF
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
};

export default SecurityDashboard;