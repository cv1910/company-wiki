import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Bell, Check, CheckCheck, FileText, MessageSquare, Calendar, GraduationCap, Users, ExternalLink } from "lucide-react";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

export default function Notifications() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const { data: notifications, isLoading } = trpc.notifications.list.useQuery();

  const markAsRead = trpc.notifications.markAsRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
  });

  const markAllAsRead = trpc.notifications.markAllAsRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
  });

  const handleNotificationClick = (notification: NonNullable<typeof notifications>[0]) => {
    if (!notification.isRead) {
      markAsRead.mutate({ id: notification.id });
    }
    
    // Navigate based on notification type and resource
    const type = notification.type;
    const resourceType = notification.resourceType;
    const resourceId = notification.resourceId;
    
    // Leave/vacation related notifications
    if (type === "leave_request" || type === "leave_approved" || type === "leave_rejected") {
      // Admins go to leave management, users go to their leave page
      if (type === "leave_request") {
        setLocation("/admin/leave");
      } else {
        setLocation("/leave");
      }
      return;
    }
    
    // Assignment notifications (onboarding, wiki articles assigned)
    if (type === "assignment" || type === "article_assigned") {
      if (resourceType === "article" && resourceId) {
        // Navigate to the assigned article
        setLocation(`/wiki/article/${resourceId}`);
      } else {
        setLocation("/onboarding");
      }
      return;
    }
    
    // Article/SOP related notifications
    if (resourceType && resourceId) {
      if (resourceType === "article") {
        setLocation(`/wiki/article/${resourceId}`);
      } else if (resourceType === "sop") {
        setLocation(`/sops/view/${resourceId}`);
      } else if (resourceType === "leave") {
        setLocation("/leave");
      }
      return;
    }
    
    // Mention notifications
    if (type === "mention") {
      setLocation("/mentions");
      return;
    }
    
    // Comment notifications
    if (type === "comment" && resourceType === "article" && resourceId) {
      setLocation(`/wiki/article/${resourceId}`);
      return;
    }
    
    // Default fallback based on type
    if (type.includes("article")) {
      setLocation("/wiki");
    } else if (type.includes("sop")) {
      setLocation("/wiki"); // SOPs are now in Wissensdatenbank
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "comment":
        return <MessageSquare className="h-4 w-4" />;
      case "article":
      case "article_assigned":
        return <FileText className="h-4 w-4" />;
      case "leave_request":
      case "leave_approved":
      case "leave_rejected":
        return <Calendar className="h-4 w-4" />;
      case "assignment":
        return <GraduationCap className="h-4 w-4" />;
      case "mention":
        return <Users className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const unreadCount = notifications?.filter((n) => !n.isRead).length || 0;

  return (
    <div className="space-y-6 pb-[calc(var(--bottom-nav-height,64px)+1rem)] md:pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Benachrichtigungen</h1>
          <p className="text-muted-foreground mt-1">
            {unreadCount > 0
              ? `${unreadCount} ungelesene Benachrichtigung${unreadCount > 1 ? "en" : ""}`
              : "Keine ungelesenen Benachrichtigungen"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            onClick={() => markAllAsRead.mutate()}
            disabled={markAllAsRead.isPending}
          >
            <CheckCheck className="h-4 w-4 mr-2" />
            Alle als gelesen markieren
          </Button>
        )}
      </div>

      {/* Notifications List */}
      <Card className="card-shadow">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications && notifications.length > 0 ? (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 flex items-start gap-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                    !notification.isRead ? "bg-primary/5" : ""
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div
                    className={`p-2 rounded-lg ${
                      !notification.isRead ? "bg-primary/10" : "bg-muted"
                    }`}
                  >
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p
                          className={`font-medium ${
                            !notification.isRead ? "text-foreground" : "text-muted-foreground"
                          }`}
                        >
                          {notification.title}
                        </p>
                        {notification.message && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {formatDistanceToNow(new Date(notification.createdAt), {
                            addSuffix: true,
                            locale: de,
                          })}
                        </p>
                      </div>
                      {!notification.isRead && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead.mutate({ id: notification.id });
                          }}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Keine Benachrichtigungen vorhanden</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
