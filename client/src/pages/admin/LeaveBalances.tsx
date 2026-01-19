import React, { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Loader2, Users, Edit, Sun, Umbrella, ArrowRight, RefreshCw, Settings } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import DashboardLayout from "@/components/DashboardLayout";

export default function AdminLeaveBalances() {
  const { user, loading: authLoading } = useAuth();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [editingUser, setEditingUser] = useState<any>(null);
  const [newTotalDays, setNewTotalDays] = useState<number>(30);
  const [carryOverDialogOpen, setCarryOverDialogOpen] = useState(false);
  const [maxCarryOverDays, setMaxCarryOverDays] = useState(10);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [autoCarryOver, setAutoCarryOver] = useState(false);
  const [settingsMaxDays, setSettingsMaxDays] = useState(10);

  const utils = trpc.useUtils();
  const { data: balances, isLoading } = trpc.leave.allBalances.useQuery({ year: selectedYear });
  const { data: carryOverSettings } = trpc.leave.carryOverSettings.useQuery();

  // Update local state when settings are loaded
  useEffect(() => {
    if (carryOverSettings) {
      setAutoCarryOver(carryOverSettings.autoCarryOver);
      setSettingsMaxDays(carryOverSettings.maxCarryOverDays);
    }
  }, [carryOverSettings]);

  const updateSettings = trpc.leave.updateCarryOverSettings.useMutation({
    onSuccess: () => {
      toast.success("Übertrag-Einstellungen gespeichert");
      setSettingsDialogOpen(false);
      utils.leave.carryOverSettings.invalidate();
    },
    onError: (error) => {
      toast.error("Fehler: " + error.message);
    },
  });

  const updateBalance = trpc.leave.updateBalance.useMutation({
    onSuccess: () => {
      toast.success("Urlaubsanspruch aktualisiert");
      setEditingUser(null);
      utils.leave.allBalances.invalidate();
    },
    onError: (error) => {
      toast.error("Fehler: " + error.message);
    },
  });

  const carryOver = trpc.leave.carryOver.useMutation({
    onSuccess: (result) => {
      toast.success(
        `Resturlaub für ${result.affectedUsers} Mitarbeiter von ${result.fromYear} nach ${result.toYear} übertragen`
      );
      setCarryOverDialogOpen(false);
      utils.leave.allBalances.invalidate();
    },
    onError: (error) => {
      toast.error("Fehler: " + error.message);
    },
  });

  const handleCarryOver = () => {
    carryOver.mutate({
      fromYear: selectedYear,
      maxCarryOverDays,
    });
  };

  const handleEdit = (userBalance: any) => {
    setEditingUser(userBalance);
    setNewTotalDays(userBalance.balance.totalDays);
  };

  const handleSave = () => {
    if (!editingUser) return;
    updateBalance.mutate({
      userId: editingUser.user.id,
      year: selectedYear,
      totalDays: newTotalDays,
    });
  };

  const years = [
    new Date().getFullYear() - 1,
    new Date().getFullYear(),
    new Date().getFullYear() + 1,
  ];

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Keine Berechtigung</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Urlaubsansprüche</h1>
            <p className="text-muted-foreground mt-1">
              Verwalten Sie die individuellen Urlaubsansprüche der Mitarbeiter
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setSettingsDialogOpen(true)}
              className="gap-2"
            >
              <Settings className="w-4 h-4" />
              Einstellungen
            </Button>
            <Button
              variant="outline"
              onClick={() => setCarryOverDialogOpen(true)}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Resturlaub übertragen
            </Button>
            <Select
            value={selectedYear.toString()}
            onValueChange={(value) => setSelectedYear(parseInt(value))}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Mitarbeiter
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{balances?.length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Gesamt Urlaubstage
              </CardTitle>
              <Sun className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {balances?.reduce((sum, b) => sum + b.balance.totalDays, 0) || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Verbleibend
              </CardTitle>
              <Umbrella className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {balances?.reduce((sum, b) => sum + (b.balance.totalDays - b.balance.usedDays), 0) || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* User List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Urlaubsansprüche {selectedYear}
            </CardTitle>
            <CardDescription>
              Übersicht aller Mitarbeiter und deren Urlaubsanspruch
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : !balances || balances.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">Keine Mitarbeiter gefunden</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                        Mitarbeiter
                      </th>
                      <th className="text-center py-3 px-4 font-medium text-muted-foreground">
                        Anspruch
                      </th>
                      <th className="text-center py-3 px-4 font-medium text-muted-foreground">
                        Übertrag
                      </th>
                      <th className="text-center py-3 px-4 font-medium text-muted-foreground">
                        Genommen
                      </th>
                      <th className="text-center py-3 px-4 font-medium text-muted-foreground">
                        Verbleibend
                      </th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">
                        Aktionen
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {balances.map((item) => (
                      <tr key={item.user.id} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={item.user.avatarUrl || undefined} />
                              <AvatarFallback>
                                {item.user.name?.charAt(0).toUpperCase() || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{item.user.name}</p>
                              <p className="text-sm text-muted-foreground">{item.user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="text-center py-3 px-4">
                          <span className="font-semibold">{item.balance.totalDays}</span>
                          <span className="text-muted-foreground"> Tage</span>
                        </td>
                        <td className="text-center py-3 px-4">
                          {('carryOverDays' in item.balance && item.balance.carryOverDays > 0) ? (
                            <span className="font-semibold text-blue-600 dark:text-blue-400">
                              +{item.balance.carryOverDays}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="text-center py-3 px-4">
                          <span className="font-semibold text-orange-600 dark:text-orange-400">
                            {item.balance.usedDays}
                          </span>
                          <span className="text-muted-foreground"> Tage</span>
                        </td>
                        <td className="text-center py-3 px-4">
                          <span className={`font-semibold ${
                            (item.balance.totalDays - item.balance.usedDays) <= 5 
                              ? "text-red-600 dark:text-red-400" 
                              : "text-green-600 dark:text-green-400"
                          }`}>
                            {item.balance.totalDays - item.balance.usedDays}
                          </span>
                          <span className="text-muted-foreground"> Tage</span>
                        </td>
                        <td className="text-right py-3 px-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(item)}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Bearbeiten
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Urlaubsanspruch bearbeiten</DialogTitle>
              <DialogDescription>
                Passen Sie den Urlaubsanspruch für {editingUser?.user.name} im Jahr {selectedYear} an.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={editingUser?.user.avatarUrl || undefined} />
                  <AvatarFallback>
                    {editingUser?.user.name?.charAt(0).toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{editingUser?.user.name}</p>
                  <p className="text-sm text-muted-foreground">{editingUser?.user.email}</p>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Urlaubsanspruch (Tage)</label>
                <Input
                  type="number"
                  min={0}
                  max={365}
                  value={newTotalDays}
                  onChange={(e) => setNewTotalDays(parseInt(e.target.value) || 0)}
                />
                <p className="text-sm text-muted-foreground">
                  Aktuell genommen: {editingUser?.balance.usedDays} Tage
                </p>
                <p className="text-sm text-muted-foreground">
                  Verbleibend nach Änderung: {Math.max(0, newTotalDays - (editingUser?.balance.usedDays || 0))} Tage
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingUser(null)}>
                Abbrechen
              </Button>
              <Button onClick={handleSave} disabled={updateBalance.isPending}>
                {updateBalance.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Speichern
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Carry Over Dialog */}
        <Dialog open={carryOverDialogOpen} onOpenChange={setCarryOverDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Resturlaub übertragen</DialogTitle>
              <DialogDescription>
                Übertragen Sie den Resturlaub aller Mitarbeiter von {selectedYear} nach {selectedYear + 1}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-center gap-4 py-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">{selectedYear}</div>
                  <div className="text-sm text-muted-foreground">Quelljahr</div>
                </div>
                <ArrowRight className="w-8 h-8 text-muted-foreground" />
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">{selectedYear + 1}</div>
                  <div className="text-sm text-muted-foreground">Zieljahr</div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Maximale Übertragstage pro Mitarbeiter</label>
                <Input
                  type="number"
                  min={0}
                  max={30}
                  value={maxCarryOverDays}
                  onChange={(e) => setMaxCarryOverDays(parseInt(e.target.value) || 0)}
                />
                <p className="text-sm text-muted-foreground">
                  Resturlaub über diesem Limit verfällt.
                </p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Hinweis:</strong> Der Übertrag wird für alle Mitarbeiter mit Resturlaub durchgeführt.
                  Bereits existierende Ansprüche für {selectedYear + 1} werden aktualisiert.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCarryOverDialogOpen(false)}>
                Abbrechen
              </Button>
              <Button onClick={handleCarryOver} disabled={carryOver.isPending}>
                {carryOver.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Übertrag durchführen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Settings Dialog */}
        <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Übertrag-Einstellungen</DialogTitle>
              <DialogDescription>
                Konfigurieren Sie den automatischen Urlaubsübertrag am Jahresende.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-carry-over" className="text-base">Automatischer Übertrag</Label>
                  <p className="text-sm text-muted-foreground">
                    Resturlaub wird am 1. Januar automatisch ins neue Jahr übertragen
                  </p>
                </div>
                <Switch
                  id="auto-carry-over"
                  checked={autoCarryOver}
                  onCheckedChange={setAutoCarryOver}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max-days">Maximale Übertragstage</Label>
                <Input
                  id="max-days"
                  type="number"
                  min={0}
                  max={30}
                  value={settingsMaxDays}
                  onChange={(e) => setSettingsMaxDays(parseInt(e.target.value) || 0)}
                />
                <p className="text-sm text-muted-foreground">
                  Resturlaub über diesem Limit verfällt am Jahresende.
                </p>
              </div>
              {autoCarryOver && (
                <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3">
                  <p className="text-sm text-green-800 dark:text-green-200">
                    <strong>Aktiviert:</strong> Am 1. Januar wird der Resturlaub automatisch übertragen.
                    Sie erhalten eine Benachrichtigung nach erfolgreichem Übertrag.
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSettingsDialogOpen(false)}>
                Abbrechen
              </Button>
              <Button
                onClick={() => updateSettings.mutate({ maxCarryOverDays: settingsMaxDays, autoCarryOver })}
                disabled={updateSettings.isPending}
              >
                {updateSettings.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Speichern
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
