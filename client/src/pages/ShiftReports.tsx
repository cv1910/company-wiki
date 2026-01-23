import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Clock, 
  Users, 
  Calendar, 
  Download, 
  ChevronLeft, 
  ChevronRight,
  BarChart3,
  TrendingUp,
  User
} from "lucide-react";

const MONTHS = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember"
];

export default function ShiftReports() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedTeamId, setSelectedTeamId] = useState<number | undefined>(undefined);
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>(undefined);
  
  // Queries
  const { data: teams } = trpc.teams.list.useQuery();
  const { data: monthlyReport, isLoading: reportLoading } = trpc.shiftReports.getMonthlyReport.useQuery({
    year: selectedYear,
    month: selectedMonth,
    teamId: selectedTeamId,
  });
  
  const { data: userReport } = trpc.shiftReports.getUserReport.useQuery(
    { userId: selectedUserId!, year: selectedYear, month: selectedMonth },
    { enabled: !!selectedUserId }
  );
  
  const { data: yearlyReport } = trpc.shiftReports.getYearlyReport.useQuery({
    year: selectedYear,
    teamId: selectedTeamId,
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
  
  // Export CSV
  const exportCSV = () => {
    if (!monthlyReport) return;
    
    const headers = ["Mitarbeiter", "Schichten", "Stunden", "Durchschnitt pro Schicht"];
    const rows = monthlyReport.users.map(u => [
      u.userName,
      u.shiftCount.toString(),
      u.totalHours.toFixed(1),
      (u.totalHours / u.shiftCount).toFixed(1),
    ]);
    
    const csv = [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `schicht-auswertung-${selectedYear}-${selectedMonth.toString().padStart(2, "0")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };
  
  // Calculate max hours for progress bars
  const maxHours = useMemo(() => {
    if (!monthlyReport?.users.length) return 160;
    return Math.max(...monthlyReport.users.map(u => u.totalHours), 160);
  }, [monthlyReport]);
  
  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }
  
  if (!user) {
    setLocation("/");
    return null;
  }
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Schicht-Auswertungen</h1>
            <p className="text-muted-foreground">
              Monatliche Übersicht der geleisteten Schichtstunden
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
        
        {/* Filters */}
        <div className="flex items-center gap-4">
          <Select
            value={selectedTeamId?.toString() || "all"}
            onValueChange={(v) => setSelectedTeamId(v === "all" ? undefined : parseInt(v))}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Alle Teams" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Teams</SelectItem>
              {teams?.map((team) => (
                <SelectItem key={team.id} value={team.id.toString()}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={exportCSV} disabled={!monthlyReport?.users.length}>
            <Download className="h-4 w-4 mr-2" />
            CSV Export
          </Button>
        </div>
        
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gesamtstunden</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {monthlyReport?.totalHours.toFixed(1) || "0"} h
              </div>
              <p className="text-xs text-muted-foreground">
                im {MONTHS[selectedMonth - 1]} {selectedYear}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Schichten</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {monthlyReport?.totalShifts || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                geplante Schichten
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
                {monthlyReport?.users.length || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                mit Schichten
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Durchschnitt</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {monthlyReport?.users.length 
                  ? (monthlyReport.totalHours / monthlyReport.users.length).toFixed(1) 
                  : "0"} h
              </div>
              <p className="text-xs text-muted-foreground">
                pro Mitarbeiter
              </p>
            </CardContent>
          </Card>
        </div>
        
        {/* Tabs */}
        <Tabs defaultValue="monthly" className="space-y-4">
          <TabsList>
            <TabsTrigger value="monthly">Monatsübersicht</TabsTrigger>
            <TabsTrigger value="yearly">Jahresübersicht</TabsTrigger>
            {selectedUserId && <TabsTrigger value="user">Mitarbeiter-Detail</TabsTrigger>}
          </TabsList>
          
          {/* Monthly Tab */}
          <TabsContent value="monthly" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Stunden pro Mitarbeiter</CardTitle>
                <CardDescription>
                  {MONTHS[selectedMonth - 1]} {selectedYear}
                  {monthlyReport?.teamName && ` - ${monthlyReport.teamName}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {reportLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : monthlyReport?.users.length ? (
                  <div className="space-y-4">
                    {monthlyReport.users.map((userItem) => (
                      <div
                        key={userItem.userId}
                        className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => setSelectedUserId(userItem.userId)}
                      >
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium truncate">{userItem.userName}</span>
                            <span className="text-sm font-semibold">
                              {userItem.totalHours.toFixed(1)} h
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Progress 
                              value={(userItem.totalHours / maxHours) * 100} 
                              className="h-2 flex-1"
                            />
                            <Badge variant="secondary" className="text-xs">
                              {userItem.shiftCount} Schichten
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Keine Schichtdaten für diesen Zeitraum</p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Detailed Table */}
            {monthlyReport?.users.length ? (
              <Card>
                <CardHeader>
                  <CardTitle>Detaillierte Übersicht</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mitarbeiter</TableHead>
                        <TableHead className="text-right">Schichten</TableHead>
                        <TableHead className="text-right">Stunden</TableHead>
                        <TableHead className="text-right">Ø pro Schicht</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthlyReport.users.map((userItem) => (
                        <TableRow 
                          key={userItem.userId}
                          className="cursor-pointer"
                          onClick={() => setSelectedUserId(userItem.userId)}
                        >
                          <TableCell className="font-medium">{userItem.userName}</TableCell>
                          <TableCell className="text-right">{userItem.shiftCount}</TableCell>
                          <TableCell className="text-right">{userItem.totalHours.toFixed(1)} h</TableCell>
                          <TableCell className="text-right">
                            {(userItem.totalHours / userItem.shiftCount).toFixed(1)} h
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-semibold bg-muted/50">
                        <TableCell>Gesamt</TableCell>
                        <TableCell className="text-right">{monthlyReport.totalShifts}</TableCell>
                        <TableCell className="text-right">{monthlyReport.totalHours.toFixed(1)} h</TableCell>
                        <TableCell className="text-right">
                          {monthlyReport.totalShifts > 0 
                            ? (monthlyReport.totalHours / monthlyReport.totalShifts).toFixed(1) 
                            : "0"} h
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : null}
          </TabsContent>
          
          {/* Yearly Tab */}
          <TabsContent value="yearly" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Jahresübersicht {selectedYear}</CardTitle>
                <CardDescription>
                  Monatliche Entwicklung der Schichtstunden
                </CardDescription>
              </CardHeader>
              <CardContent>
                {yearlyReport ? (
                  <div className="space-y-4">
                    {/* Summary */}
                    <div className="grid gap-4 md:grid-cols-3 mb-6">
                      <div className="p-4 rounded-lg bg-muted/50">
                        <p className="text-sm text-muted-foreground">Jahres-Gesamtstunden</p>
                        <p className="text-2xl font-bold">{yearlyReport.totalHours.toFixed(1)} h</p>
                      </div>
                      <div className="p-4 rounded-lg bg-muted/50">
                        <p className="text-sm text-muted-foreground">Schichten gesamt</p>
                        <p className="text-2xl font-bold">{yearlyReport.totalShifts}</p>
                      </div>
                      <div className="p-4 rounded-lg bg-muted/50">
                        <p className="text-sm text-muted-foreground">Ø pro Monat</p>
                        <p className="text-2xl font-bold">{yearlyReport.averageHoursPerMonth.toFixed(1)} h</p>
                      </div>
                    </div>
                    
                    {/* Monthly breakdown */}
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Monat</TableHead>
                          <TableHead className="text-right">Mitarbeiter</TableHead>
                          <TableHead className="text-right">Schichten</TableHead>
                          <TableHead className="text-right">Stunden</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {yearlyReport.monthlyReports.map((report) => (
                          <TableRow 
                            key={report.month}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => setSelectedMonth(report.month)}
                          >
                            <TableCell className="font-medium">{MONTHS[report.month - 1]}</TableCell>
                            <TableCell className="text-right">{report.userCount}</TableCell>
                            <TableCell className="text-right">{report.totalShifts}</TableCell>
                            <TableCell className="text-right">{report.totalHours.toFixed(1)} h</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* User Detail Tab */}
          {selectedUserId && (
            <TabsContent value="user" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{userReport?.userName || "Mitarbeiter"}</CardTitle>
                      <CardDescription>
                        Schichtdetails für {MONTHS[selectedMonth - 1]} {selectedYear}
                      </CardDescription>
                    </div>
                    <Button variant="outline" onClick={() => setSelectedUserId(undefined)}>
                      Zurück zur Übersicht
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {userReport ? (
                    <div className="space-y-6">
                      {/* User Summary */}
                      <div className="grid gap-4 md:grid-cols-4">
                        <div className="p-4 rounded-lg bg-muted/50">
                          <p className="text-sm text-muted-foreground">Gesamtstunden</p>
                          <p className="text-2xl font-bold">{userReport.totalHours.toFixed(1)} h</p>
                        </div>
                        <div className="p-4 rounded-lg bg-muted/50">
                          <p className="text-sm text-muted-foreground">Schichten</p>
                          <p className="text-2xl font-bold">{userReport.totalShifts}</p>
                        </div>
                        <div className="p-4 rounded-lg bg-muted/50">
                          <p className="text-sm text-muted-foreground">Ø pro Schicht</p>
                          <p className="text-2xl font-bold">{userReport.averageHoursPerShift.toFixed(1)} h</p>
                        </div>
                        <div className="p-4 rounded-lg bg-muted/50">
                          <p className="text-sm text-muted-foreground">Wochen aktiv</p>
                          <p className="text-2xl font-bold">{userReport.weeklyHours.length}</p>
                        </div>
                      </div>
                      
                      {/* Weekly breakdown */}
                      {userReport.weeklyHours.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-3">Wöchentliche Verteilung</h4>
                          <div className="flex gap-2 flex-wrap">
                            {userReport.weeklyHours.map((week) => (
                              <div 
                                key={week.week}
                                className="p-3 rounded-lg bg-primary/10 text-center min-w-[80px]"
                              >
                                <p className="text-xs text-muted-foreground">KW {week.week}</p>
                                <p className="font-semibold">{week.hours.toFixed(1)} h</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Shift list */}
                      <div>
                        <h4 className="font-medium mb-3">Alle Schichten</h4>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Datum</TableHead>
                              <TableHead>Schicht</TableHead>
                              <TableHead>Zeit</TableHead>
                              <TableHead className="text-right">Stunden</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {userReport.shifts.map((shift) => (
                              <TableRow key={shift.id}>
                                <TableCell>
                                  {new Date(shift.date).toLocaleDateString("de-DE", {
                                    weekday: "short",
                                    day: "2-digit",
                                    month: "2-digit",
                                  })}
                                </TableCell>
                                <TableCell>{shift.title}</TableCell>
                                <TableCell>
                                  {shift.isAllDay 
                                    ? "Ganztägig" 
                                    : `${shift.startTime} - ${shift.endTime}`}
                                </TableCell>
                                <TableCell className="text-right">{shift.hours.toFixed(1)} h</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-32">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
