import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  FileText,
  Download,
  AlertCircle,
  User,
  Clock
} from "lucide-react";
import { format, startOfMonth, endOfMonth, differenceInHours } from "date-fns";
import { de } from "date-fns/locale";

const MONTHS = [
  { value: 1, label: "Januar" },
  { value: 2, label: "Februar" },
  { value: 3, label: "März" },
  { value: 4, label: "April" },
  { value: 5, label: "Mai" },
  { value: 6, label: "Juni" },
  { value: 7, label: "Juli" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "Oktober" },
  { value: 11, label: "November" },
  { value: 12, label: "Dezember" },
];

export default function SickLeaveReport() {
  const { user } = useAuth();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  
  const isAdmin = user?.role === "admin" || user?.role === "editor";
  
  // Fetch sick leave report
  const { data: sickLeaveData, isLoading } = trpc.calendar.getSickLeaveReport.useQuery(
    { year: selectedYear, month: selectedMonth },
    { enabled: isAdmin }
  );
  
  // Navigate months
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
  
  // Group sick leave by employee
  const groupedByEmployee = sickLeaveData?.reduce((acc, entry) => {
    const key = entry.userId;
    if (!acc[key]) {
      acc[key] = {
        userId: entry.userId,
        userName: entry.userName || "Unbekannt",
        userEmail: entry.userEmail,
        entries: [],
        totalHours: 0,
      };
    }
    acc[key].entries.push(entry);
    const hours = differenceInHours(new Date(entry.endDate), new Date(entry.startDate));
    acc[key].totalHours += hours;
    return acc;
  }, {} as Record<number, { userId: number; userName: string; userEmail: string | null; entries: typeof sickLeaveData; totalHours: number }>) || {};
  
  const employeeList = Object.values(groupedByEmployee);
  const totalSickDays = sickLeaveData?.length || 0;
  const totalSickHours = employeeList.reduce((sum, emp) => sum + emp.totalHours, 0);
  
  // Export to CSV
  const exportToCSV = () => {
    if (!sickLeaveData || sickLeaveData.length === 0) return;
    
    const headers = ["Mitarbeiter", "E-Mail", "Datum", "Schicht", "Stunden", "Notiz"];
    const rows = sickLeaveData.map(entry => [
      entry.userName || "Unbekannt",
      entry.userEmail || "",
      format(new Date(entry.startDate), "dd.MM.yyyy"),
      entry.title,
      differenceInHours(new Date(entry.endDate), new Date(entry.startDate)).toString(),
      entry.sickLeaveNote || "",
    ]);
    
    const csvContent = [
      headers.join(";"),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(";")),
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `krankmeldungen_${selectedYear}_${selectedMonth.toString().padStart(2, "0")}.csv`;
    link.click();
  };
  
  if (!isAdmin) {
    return (
      <div className="container py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium">Keine Berechtigung</p>
            <p className="text-muted-foreground">
              Diese Seite ist nur für Administratoren und Editoren zugänglich.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Krankmeldungen</h1>
          <p className="text-muted-foreground">
            Monatliche Übersicht aller Fehltage durch Krankmeldung
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={exportToCSV}
          disabled={!sickLeaveData || sickLeaveData.length === 0}
        >
          <Download className="h-4 w-4 mr-2" />
          CSV Export
        </Button>
      </div>
      
      {/* Month Navigation */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center gap-4">
              <Select
                value={selectedMonth.toString()}
                onValueChange={(v) => setSelectedMonth(parseInt(v))}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((month) => (
                    <SelectItem key={month.value} value={month.value.toString()}>
                      {month.label}
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
            </div>
            
            <Button variant="outline" size="icon" onClick={goToNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30">
                <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Krankmeldungen</p>
                <p className="text-2xl font-bold">{totalSickDays}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-orange-100 dark:bg-orange-900/30">
                <Clock className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ausgefallene Stunden</p>
                <p className="text-2xl font-bold">{totalSickHours}h</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Betroffene Mitarbeiter</p>
                <p className="text-2xl font-bold">{employeeList.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Sick Leave Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Detailübersicht
          </CardTitle>
          <CardDescription>
            Alle Krankmeldungen im {MONTHS.find(m => m.value === selectedMonth)?.label} {selectedYear}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : sickLeaveData && sickLeaveData.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mitarbeiter</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead>Schicht</TableHead>
                  <TableHead>Stunden</TableHead>
                  <TableHead>Notiz</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sickLeaveData.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{entry.userName || "Unbekannt"}</p>
                        {entry.userEmail && (
                          <p className="text-xs text-muted-foreground">{entry.userEmail}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(entry.startDate), "EEE, dd.MM.yyyy", { locale: de })}
                    </TableCell>
                    <TableCell>{entry.title}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {differenceInHours(new Date(entry.endDate), new Date(entry.startDate))}h
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      {entry.sickLeaveNote ? (
                        <span className="text-sm text-muted-foreground truncate block">
                          {entry.sickLeaveNote}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground/50">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-lg font-medium">Keine Krankmeldungen</p>
              <p className="text-muted-foreground">
                Im {MONTHS.find(m => m.value === selectedMonth)?.label} {selectedYear} wurden keine Krankmeldungen erfasst.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Per Employee Summary */}
      {employeeList.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Zusammenfassung pro Mitarbeiter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mitarbeiter</TableHead>
                  <TableHead className="text-center">Anzahl Krankmeldungen</TableHead>
                  <TableHead className="text-center">Ausgefallene Stunden</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employeeList
                  .sort((a, b) => b.totalHours - a.totalHours)
                  .map((employee) => (
                    <TableRow key={employee.userId}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{employee.userName}</p>
                          {employee.userEmail && (
                            <p className="text-xs text-muted-foreground">{employee.userEmail}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{employee.entries.length}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                          {employee.totalHours}h
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
