import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Bell, MessageCircle, CheckSquare, Megaphone, Calendar, FileText, X, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { useLocation } from "wouter";

interface NotificationCenterProps {
  totalCount: number;
}

interface Task {
  id: number;
  title: string;
  description: string | null;
  dueDate: number | null;
  priority: string;
  status: string;
}

export function NotificationCenter({ totalCount }: NotificationCenterProps) {
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  // Fetch all notification types
  const { data: systemNotifications } = trpc.notifications.list.useQuery(
    { limit: 20 },
    { enabled: open }
  );

  const { data: unreadTaps } = trpc.ohweees.unreadCount.useQuery(undefined, {
    enabled: open,
  });

  const { data: openTasks } = trpc.tasks.getAssignedToMe.useQuery(undefined, {
    enabled: open,
  });

  // Mutations
  const markAsReadMutation = trpc.notifications.markAsRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
  });

  const markAllAsReadMutation = trpc.notifications.markAllAsRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
  });

  const handleNotificationClick = (notification: any) => {
    // Mark as read
    if (!notification.isRead) {
      markAsReadMutation.mutate({ id: notification.id });
    }

    // Navigate based on type
    if (notification.link) {
      setLocation(notification.link);
      setOpen(false);
    }
  };

  const handleTaskClick = (taskId: number) => {
    setLocation(`/aufgaben?task=${taskId}`);
    setOpen(false);
  };

  const handleTapsClick = () => {
    setLocation("/taps");
    setOpen(false);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "mention":
        return <MessageCircle className="h-4 w-4 text-blue-500" />;
      case "task":
        return <CheckSquare className="h-4 w-4 text-green-500" />;
      case "announcement":
        return <Megaphone className="h-4 w-4 text-orange-500" />;
      case "calendar":
        return <Calendar className="h-4 w-4 text-purple-500" />;
      case "article":
        return <FileText className="h-4 w-4 text-cyan-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const unreadSystemCount = systemNotifications?.filter((n) => !n.isRead).length || 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {totalCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 text-xs flex items-center justify-center"
            >
              {totalCount > 99 ? "99+" : totalCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Benachrichtigungen</h3>
          {unreadSystemCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllAsReadMutation.mutate()}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Alle als gelesen markieren
            </Button>
          )}
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
            <TabsTrigger
              value="all"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              Alle
            </TabsTrigger>
            <TabsTrigger
              value="taps"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              Taps
              {(unreadTaps || 0) > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-5 px-1.5">
                  {unreadTaps}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="tasks"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              Aufgaben
              {(openTasks?.length || 0) > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-5 px-1.5">
                  {openTasks?.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="system"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              System
              {unreadSystemCount > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-5 px-1.5">
                  {unreadSystemCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[350px]">
            <TabsContent value="all" className="m-0">
              <div className="divide-y">
                {/* Unread Taps Summary */}
                {(unreadTaps || 0) > 0 && (
                  <button
                    onClick={handleTapsClick}
                    className="w-full p-4 text-left hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                        <MessageCircle className="h-4 w-4 text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">
                          {unreadTaps} ungelesene Nachrichten
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          In deinen Taps-Chats
                        </p>
                      </div>
                    </div>
                  </button>
                )}

                {/* Open Tasks Summary */}
                {(openTasks?.length || 0) > 0 && (
                  <button
                    onClick={() => {
                      setLocation("/aufgaben");
                      setOpen(false);
                    }}
                    className="w-full p-4 text-left hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
                        <CheckSquare className="h-4 w-4 text-green-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">
                          {openTasks?.length} offene Aufgaben
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Dir zugewiesen
                        </p>
                      </div>
                    </div>
                  </button>
                )}

                {/* System Notifications */}
                {systemNotifications?.slice(0, 5).map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full p-4 text-left hover:bg-accent/50 transition-colors ${
                      !notification.isRead ? "bg-accent/20" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-full bg-gray-100 dark:bg-gray-800">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm line-clamp-1">
                          {notification.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(notification.createdAt), {
                            addSuffix: true,
                            locale: de,
                          })}
                        </p>
                      </div>
                      {!notification.isRead && (
                        <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                      )}
                    </div>
                  </button>
                ))}

                {/* Empty State */}
                {(unreadTaps || 0) === 0 &&
                  (openTasks?.length || 0) === 0 &&
                  (systemNotifications?.length || 0) === 0 && (
                    <div className="p-8 text-center text-muted-foreground">
                      <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Keine Benachrichtigungen</p>
                    </div>
                  )}
              </div>
            </TabsContent>

            <TabsContent value="taps" className="m-0">
              <div className="divide-y">
                {(unreadTaps || 0) > 0 ? (
                  <button
                    onClick={handleTapsClick}
                    className="w-full p-4 text-left hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                        <MessageCircle className="h-5 w-5 text-blue-500" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">
                          {unreadTaps} ungelesene Nachrichten
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Klicke um alle Chats zu sehen
                        </p>
                      </div>
                    </div>
                  </button>
                ) : (
                  <div className="p-8 text-center text-muted-foreground">
                    <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Keine ungelesenen Nachrichten</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="tasks" className="m-0">
              <div className="divide-y">
                {openTasks && openTasks.length > 0 ? (
                  openTasks.slice(0, 10).map((item) => (
                    <button
                      key={item.task.id}
                      onClick={() => handleTaskClick(item.task.id)}
                      className="w-full p-4 text-left hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
                          <CheckSquare className="h-4 w-4 text-green-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm line-clamp-1">
                            {item.task.title}
                          </p>
                          {item.task.dueDate && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Fällig:{" "}
                              {new Date(item.task.dueDate).toLocaleDateString("de-DE")}
                            </p>
                          )}
                        </div>
                        <Badge
                          variant={
                            item.task.priority === "high" || item.task.priority === "urgent"
                              ? "destructive"
                              : item.task.priority === "medium"
                              ? "default"
                              : "secondary"
                          }
                          className="text-xs"
                        >
                          {item.task.priority === "high" || item.task.priority === "urgent"
                            ? "Hoch"
                            : item.task.priority === "medium"
                            ? "Mittel"
                            : "Niedrig"}
                        </Badge>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-8 text-center text-muted-foreground">
                    <CheckSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Keine offenen Aufgaben</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="system" className="m-0">
              <div className="divide-y">
                {systemNotifications && systemNotifications.length > 0 ? (
                  systemNotifications.map((notification) => (
                    <button
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`w-full p-4 text-left hover:bg-accent/50 transition-colors ${
                        !notification.isRead ? "bg-accent/20" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-full bg-gray-100 dark:bg-gray-800">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm line-clamp-1">
                            {notification.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(
                              new Date(notification.createdAt),
                              {
                                addSuffix: true,
                                locale: de,
                              }
                            )}
                          </p>
                        </div>
                        {!notification.isRead && (
                          <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                        )}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-8 text-center text-muted-foreground">
                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Keine Systembenachrichtigungen</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <div className="p-3 border-t">
          <Button
            variant="ghost"
            className="w-full text-sm"
            onClick={() => {
              setLocation("/notifications");
              setOpen(false);
            }}
          >
            Alle Benachrichtigungen anzeigen
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
