import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { GitCompare, Columns, AlignJustify } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DiffViewerProps {
  articleId: number;
  versions: Array<{
    versionNumber: number;
    title: string;
    createdAt: Date;
    changeDescription: string | null;
  }>;
}

type DiffPart = {
  type: "added" | "removed" | "unchanged";
  text: string;
};

export function DiffViewer({ articleId, versions }: DiffViewerProps) {
  const [fromVersion, setFromVersion] = useState<number>(
    versions.length > 1 ? versions[versions.length - 2].versionNumber : versions[0]?.versionNumber || 1
  );
  const [toVersion, setToVersion] = useState<number>(
    versions[versions.length - 1]?.versionNumber || 1
  );
  const [viewMode, setViewMode] = useState<"inline" | "sideBySide">("inline");

  const { data: diff, isLoading } = trpc.versions.diff.useQuery(
    { articleId, fromVersion, toVersion },
    { enabled: fromVersion !== toVersion }
  );

  // Type-safe conversion of diff data
  const titleDiff: DiffPart[] = diff?.titleDiff?.map(d => ({
    type: d.type as "added" | "removed" | "unchanged",
    text: d.text
  })) || [];

  const contentDiff: DiffPart[] = diff?.contentDiff?.map(d => ({
    type: d.type as "added" | "removed" | "unchanged",
    text: d.text
  })) || [];

  const renderInlineDiff = (parts: DiffPart[]) => {
    return (
      <div className="font-mono text-sm whitespace-pre-wrap leading-relaxed">
        {parts.map((part, index) => {
          if (part.type === "added") {
            return (
              <span
                key={index}
                className="bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 px-0.5 rounded"
              >
                {part.text}
              </span>
            );
          }
          if (part.type === "removed") {
            return (
              <span
                key={index}
                className="bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 line-through px-0.5 rounded"
              >
                {part.text}
              </span>
            );
          }
          return <span key={index}>{part.text}</span>;
        })}
      </div>
    );
  };

  const renderSideBySide = (parts: DiffPart[]) => {
    const leftParts: DiffPart[] = [];
    const rightParts: DiffPart[] = [];

    parts.forEach((part) => {
      if (part.type === "removed") {
        leftParts.push(part);
      } else if (part.type === "added") {
        rightParts.push(part);
      } else {
        leftParts.push(part);
        rightParts.push(part);
      }
    });

    return (
      <div className="grid grid-cols-2 gap-4">
        <div className="border rounded-lg p-4 bg-red-50/50 dark:bg-red-950/20">
          <div className="text-xs font-medium text-muted-foreground mb-2">
            Version {fromVersion} (Alt)
          </div>
          <div className="font-mono text-sm whitespace-pre-wrap leading-relaxed">
            {leftParts.map((part, index) => {
              if (part.type === "removed") {
                return (
                  <span
                    key={index}
                    className="bg-red-200 dark:bg-red-800/50 text-red-900 dark:text-red-100 px-0.5 rounded"
                  >
                    {part.text}
                  </span>
                );
              }
              return <span key={index}>{part.text}</span>;
            })}
          </div>
        </div>
        <div className="border rounded-lg p-4 bg-green-50/50 dark:bg-green-950/20">
          <div className="text-xs font-medium text-muted-foreground mb-2">
            Version {toVersion} (Neu)
          </div>
          <div className="font-mono text-sm whitespace-pre-wrap leading-relaxed">
            {rightParts.map((part, index) => {
              if (part.type === "added") {
                return (
                  <span
                    key={index}
                    className="bg-green-200 dark:bg-green-800/50 text-green-900 dark:text-green-100 px-0.5 rounded"
                  >
                    {part.text}
                  </span>
                );
              }
              return <span key={index}>{part.text}</span>;
            })}
          </div>
        </div>
      </div>
    );
  };

  if (versions.length < 2) {
    return (
      <Card className="card-shadow">
        <CardContent className="p-6 text-center text-muted-foreground">
          <GitCompare className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Es gibt nur eine Version dieses Artikels.</p>
          <p className="text-sm mt-2">Änderungen werden nach der ersten Bearbeitung hier angezeigt.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-shadow">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <GitCompare className="h-5 w-5" />
            Versionsvergleich
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "inline" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("inline")}
            >
              <AlignJustify className="h-4 w-4 mr-1" />
              Inline
            </Button>
            <Button
              variant={viewMode === "sideBySide" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("sideBySide")}
            >
              <Columns className="h-4 w-4 mr-1" />
              Nebeneinander
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Von:</span>
            <Select
              value={fromVersion.toString()}
              onValueChange={(v) => setFromVersion(parseInt(v))}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {versions.map((v) => (
                  <SelectItem key={v.versionNumber} value={v.versionNumber.toString()}>
                    Version {v.versionNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Nach:</span>
            <Select
              value={toVersion.toString()}
              onValueChange={(v) => setToVersion(parseInt(v))}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {versions.map((v) => (
                  <SelectItem key={v.versionNumber} value={v.versionNumber.toString()}>
                    Version {v.versionNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {fromVersion === toVersion ? (
          <div className="text-center text-muted-foreground py-8">
            Bitte wählen Sie zwei verschiedene Versionen zum Vergleichen.
          </div>
        ) : isLoading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="h-40 bg-muted rounded" />
          </div>
        ) : diff ? (
          <ScrollArea className="max-h-[600px]">
            <div className="space-y-6">
              {/* Title Diff */}
              {titleDiff.some((d) => d.type !== "unchanged") && (
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Badge variant="outline">Titel</Badge>
                  </h4>
                  {viewMode === "inline"
                    ? renderInlineDiff(titleDiff)
                    : renderSideBySide(titleDiff)}
                </div>
              )}

              {/* Content Diff */}
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Badge variant="outline">Inhalt</Badge>
                  <span className="text-xs text-muted-foreground">
                    {contentDiff.filter((d) => d.type === "added").length} Hinzufügungen,{" "}
                    {contentDiff.filter((d) => d.type === "removed").length} Entfernungen
                  </span>
                </h4>
                {viewMode === "inline"
                  ? renderInlineDiff(contentDiff)
                  : renderSideBySide(contentDiff)}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 pt-4 border-t text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-green-200 dark:bg-green-800" />
                  <span>Hinzugefügt</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-red-200 dark:bg-red-800" />
                  <span>Entfernt</span>
                </div>
              </div>
            </div>
          </ScrollArea>
        ) : null}
      </CardContent>
    </Card>
  );
}
