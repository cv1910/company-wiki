import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import {
  FileText,
  UserPlus,
  GitBranch,
  Calendar,
  HelpCircle,
  Code,
  Layout,
  Sparkles,
} from "lucide-react";

interface TemplateSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (content: string, templateName: string) => void;
}

const iconMap: Record<string, React.ReactNode> = {
  FileText: <FileText className="h-6 w-6" />,
  UserPlus: <UserPlus className="h-6 w-6" />,
  GitBranch: <GitBranch className="h-6 w-6" />,
  Calendar: <Calendar className="h-6 w-6" />,
  HelpCircle: <HelpCircle className="h-6 w-6" />,
  Code: <Code className="h-6 w-6" />,
  Layout: <Layout className="h-6 w-6" />,
};

export default function TemplateSelector({
  open,
  onOpenChange,
  onSelect,
}: TemplateSelectorProps) {
  const { data: systemTemplates, isLoading: loadingSystem } = trpc.templates.getSystem.useQuery(
    undefined,
    { enabled: open }
  );
  const { data: customTemplates, isLoading: loadingCustom } = trpc.templates.getCustom.useQuery(
    undefined,
    { enabled: open }
  );

  const handleSelect = (template: { content: string; name: string }) => {
    onSelect(template.content, template.name);
    onOpenChange(false);
  };

  const renderTemplateCard = (template: {
    id: number;
    name: string;
    description: string | null;
    content: string;
    icon: string | null;
  }) => (
    <Card
      key={template.id}
      className="cursor-pointer hover:bg-muted/50 transition-colors card-shadow"
      onClick={() => handleSelect(template)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            {template.icon && iconMap[template.icon] ? (
              iconMap[template.icon]
            ) : (
              <FileText className="h-6 w-6" />
            )}
          </div>
          <div>
            <CardTitle className="text-base">{template.name}</CardTitle>
            {template.description && (
              <CardDescription className="text-xs mt-0.5">
                {template.description}
              </CardDescription>
            )}
          </div>
        </div>
      </CardHeader>
    </Card>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Vorlage auswählen
          </DialogTitle>
          <DialogDescription>
            Wählen Sie eine Vorlage als Ausgangspunkt für Ihren Artikel
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="system" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="system">Standard-Vorlagen</TabsTrigger>
            <TabsTrigger value="custom">Eigene Vorlagen</TabsTrigger>
          </TabsList>

          <TabsContent value="system" className="mt-4">
            {loadingSystem ? (
              <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-20 rounded-xl" />
                ))}
              </div>
            ) : systemTemplates && systemTemplates.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {systemTemplates.map(renderTemplateCard)}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Keine Standard-Vorlagen verfügbar
              </p>
            )}
          </TabsContent>

          <TabsContent value="custom" className="mt-4">
            {loadingCustom ? (
              <div className="grid grid-cols-2 gap-3">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-20 rounded-xl" />
                ))}
              </div>
            ) : customTemplates && customTemplates.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {customTemplates.map(renderTemplateCard)}
              </div>
            ) : (
              <div className="text-center py-8">
                <Layout className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  Noch keine eigenen Vorlagen erstellt
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Eigene Vorlagen können im Admin-Bereich erstellt werden
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
