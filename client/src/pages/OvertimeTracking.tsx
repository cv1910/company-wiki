import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Calculator,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Download,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";

const MONTHS = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember"
];

export default function OvertimeTracking() {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);

  // Queries
  const { data: summary, refetch: refetchSummary, isLoading } = trpc.overtime.getSummary.useQuery({
    year: selectedYear,
    month: selectedMonth,
  });

  const calculateMutation = trpc.overtime.calculateAll.useMutation({
    onSuccess: (result) => {
      toast.success(`${result.processed} Überstunden-Einträge berechnet`);
      if (result.errors.length > 0) {
        toast.warning(`${result.errors.length} Fehler aufgetreten`);
      }
      refetchSummary();
    },
    onError: (error) => {
      toast.error(`Fehler: ${error.message}`);
    },
  });

  const approveMutation = trpc.overtime.approve.useMutation({
    onSuccess: () => {
      toast.success("Überstunden genehmigt");
      refetchSummary();
    },
    onError: (error) => {
      toast.error(`Fehler: ${error.message}`);
    },
  });

  // Navigation
  const goToPreviousMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  // Calculate stats
  const stats = useMemo(() => {
    if (!summary) return null;
    
    const maxOvertime = Math.max(...summary.balances.map(b => Math.abs(parseFloat(b.balance.overtimeHours))), 1);
    
    return {
      maxOvertime,
      avgOvertime: summary.totalUsers > 0 ? summary.totalOvertimeHours / summary.totalUsers : 0,
    };
  }, [summary]);

  // Export CSV
  const exportCSV = () => {
    if (!summary) return;
    
    const headers = ["Mitarbeiter", "Soll-Stunden", "Ist-Stunden", "Überstunden", "Übertrag", "Status"];
    const rows = summary.balances.map(b => [
      b.user.name || b.user.email,
      b.balance.targetHours,
      b.balance.actualHours,
      b.balance.overtimeHours,
      b.balance.carryOverHours,
      b.balance.status === "approved" ? "Genehmigt" : b.balance.status === "paid_out" ? "Ausbezahlt" : "Ausstehend",
    ]);
    
    const csv = [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ueberstunden-${selectedYear}-${selectedMonth.toString().padStart(2, "0")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getOvertimeColor = (hours: number) => {
    if (hours > 10) return "text-red-600";
    if (hours > 0) return "text-orange-600";
    if (hours < -10) return "text-blue-600";
    if (hours < 0) return "text-green-600";
    return "text-muted-foreground";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-100 text-green-800">Genehmigt</Badge>;
      case "paid_out":
        return <Badge className="bg-blue-100 text-blue-800">Ausbezahlt</Badge>;
      default:
        return <Badge variant="secondary">Ausstehend</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Überstunden-Tracking</h1>
            <p className="text-muted-foreground">
              Soll-/Ist-Vergleich und Überstundenberechnung
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <Select
              value={selectedMonth.toString()}
              onValueChange={(v) => setSelectedMonth(parseInt(v))}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((month, idx) => (
                  <SelectItem key={idx} value={(idx + 1).toString()}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select
              value={selectedYear.toString()}
              onValueChange={(v) => setSelectedYear(parseInt(v))}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026, 2027].map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button variant="outline" size="icon" onClick={goToNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => calculateMutation.mutate({ year: selectedYear, month: selectedMonth })}
            disabled={calculateMutation.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${calculateMutation.isPending ? "animate-spin" : ""}`} />
            {calculateMutation.isPending ? "Berechne..." : "Überstunden berechnen"}
          </Button>
          <Button variant="outline" onClick={exportCSV} disabled={!summary?.balances.length}>
            <Download className="h-4 w-4 mr-2" />
            CSV Export
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gesamt Soll-Stunden</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary?.totalTargetHours.toFixed(1) || "0"} h
              </div>
              <p className="text-xs text-muted-foreground">
                für {summary?.totalUsers || 0} Mitarbeiter
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gesamt Ist-Stunden</CardTitle>
              <Calculator className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary?.totalActualHours.toFixed(1) || "0"} h
              </div>
              <p className="text-xs text-muted-foreground">
                tatsächlich gearbeitet
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gesamt Überstunden</CardTitle>
              {(summary?.totalOvertimeHours || 0) >= 0 ? (
                <TrendingUp className="h-4 w-4 text-orange-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-green-500" />
              )}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getOvertimeColor(summary?.totalOvertimeHours || 0)}`}>
                {(summary?.totalOvertimeHours || 0) >= 0 ? "+" : ""}{summary?.totalOvertimeHours.toFixed(1) || "0"} h
              </div>
              <p className="text-xs text-muted-foreground">
                {(summary?.totalOvertimeHours || 0) >= 0 ? "Mehrarbeit" : "Minusstunden"}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Mitarbeiter</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <span className="text-orange-600">{summary?.usersWithOvertime || 0}</span>
                {" / "}
                <span className="text-green-600">{summary?.usersUndertime || 0}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Überstunden / Minusstunden
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Übersicht</TabsTrigger>
            <TabsTrigger value="details">Detaillierte Tabelle</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Überstunden pro Mitarbeiter</CardTitle>
                <CardDescription>
                  {MONTHS[selectedMonth - 1]} {selectedYear}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : summary?.balances.length ? (
                  <div className="space-y-4">
                    {summary.balances.map((item) => {
                      const overtime = parseFloat(item.balance.overtimeHours);
                      const target = parseFloat(item.balance.targetHours);
                      const actual = parseFloat(item.balance.actualHours);
                      const percentage = target > 0 ? (actual / target) * 100 : 0;
                      
                      return (
                        <div
                          key={item.balance.id}
                          className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={item.user.avatarUrl || undefined} />
                            <AvatarFallback>
                              {item.user.name?.charAt(0) || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium truncate">{item.user.name}</span>
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-semibold ${getOvertimeColor(overtime)}`}>
                                  {overtime >= 0 ? "+" : ""}{overtime.toFixed(1)} h
                                </span>
                                {getStatusBadge(item.balance.status)}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Progress 
                                value={Math.min(percentage, 150)} 
                                className="h-2 flex-1"
                              />
                              <span className="text-xs text-muted-foreground w-24 text-right">
                                {actual.toFixed(1)} / {target.toFixed(1)} h
                              </span>
                            </div>
                          </div>
                          {item.balance.status === "pending" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => approveMutation.mutate({ id: item.balance.id })}
                              disabled={approveMutation.isPending}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Keine Überstunden-Daten für diesen Zeitraum</p>
                    <p className="text-sm mt-2">
                      Klicken Sie auf "Überstunden berechnen" um die Daten zu generieren.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Details Tab */}
          <TabsContent value="details">
            <Card>
              <CardHeader>
                <CardTitle>Detaillierte Überstunden-Übersicht</CardTitle>
                <CardDescription>
                  Alle Mitarbeiter mit Soll-/Ist-Vergleich
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mitarbeiter</TableHead>
                      <TableHead className="text-right">Soll-Stunden</TableHead>
                      <TableHead className="text-right">Ist-Stunden</TableHead>
                      <TableHead className="text-right">Differenz</TableHead>
                      <TableHead className="text-right">Übertrag</TableHead>
                      <TableHead className="text-right">Gesamt</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary?.balances.map((item) => {
                      const overtime = parseFloat(item.balance.overtimeHours);
                      const carryOver = parseFloat(item.balance.carryOverHours);
                      const total = overtime + carryOver;
                      
                      return (
                        <TableRow key={item.balance.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={item.user.avatarUrl || undefined} />
                                <AvatarFallback>
                                  {item.user.name?.charAt(0) || "?"}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{item.user.name}</div>
                                <div className="text-sm text-muted-foreground">{item.user.email}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {item.balance.targetHours} h
                          </TableCell>
                          <TableCell className="text-right">
                            {item.balance.actualHours} h
                          </TableCell>
                          <TableCell className={`text-right font-medium ${getOvertimeColor(overtime)}`}>
                            {overtime >= 0 ? "+" : ""}{overtime.toFixed(1)} h
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {carryOver >= 0 ? "+" : ""}{carryOver.toFixed(1)} h
                          </TableCell>
                          <TableCell className={`text-right font-bold ${getOvertimeColor(total)}`}>
                            {total >= 0 ? "+" : ""}{total.toFixed(1)} h
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(item.balance.status)}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.balance.status === "pending" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => approveMutation.mutate({ id: item.balance.id })}
                                disabled={approveMutation.isPending}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Genehmigen
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {(!summary?.balances || summary.balances.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          Keine Überstunden-Daten vorhanden. Berechnen Sie zuerst die Überstunden.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Info Card */}
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-sm">Hinweise zur Überstundenberechnung</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              <strong>Soll-Stunden:</strong> Die vertraglich vereinbarten Arbeitsstunden pro Monat, 
              konfiguriert unter "Soll-Stunden Verwaltung".
            </p>
            <p>
              <strong>Ist-Stunden:</strong> Die tatsächlich geleisteten Schichtstunden aus dem Kalender.
            </p>
            <p>
              <strong>Übertrag:</strong> Kumulierte Überstunden aus den Vormonaten.
            </p>
            <p>
              <strong>Status:</strong> Ausstehend → Genehmigt → Ausbezahlt
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
