import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, ClipboardList, Edit, ExternalLink, Share2, FileText, Download } from "lucide-react";
import { Streamdown } from "streamdown";
import { useLocation, useParams } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { toast } from "@/lib/hapticToast";
import { useEffect, useRef } from "react";

export default function SOPView() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const isEditor = user?.role === "editor" || user?.role === "admin";
  const scribeContainerRef = useRef<HTMLDivElement>(null);

  const { data: sop, isLoading } = trpc.sops.getBySlug.useQuery(
    { slug: slug || "" },
    { enabled: !!slug }
  );

  const { data: category } = trpc.sopCategories.list.useQuery();
  const sopCategory = category?.find((c) => c.id === sop?.categoryId);

  // Extract Scribe embed URL from scribeUrl or scribeEmbedCode
  const getScribeEmbedUrl = () => {
    if (!sop) return null;

    // If we have a direct Scribe URL
    if (sop.scribeUrl) {
      // Convert share URL to embed URL if needed
      // Scribe URLs typically look like: https://scribehow.com/shared/...
      const url = sop.scribeUrl;
      if (url.includes("scribehow.com")) {
        // Scribe embed URLs use /embed/ path
        if (url.includes("/shared/")) {
          return url.replace("/shared/", "/embed/");
        }
        return url;
      }
      return url;
    }

    // If we have embed code, extract the src
    if (sop.scribeEmbedCode) {
      const srcMatch = sop.scribeEmbedCode.match(/src=["']([^"']+)["']/);
      if (srcMatch) {
        return srcMatch[1];
      }
    }

    return null;
  };

  const scribeEmbedUrl = getScribeEmbedUrl();

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link in die Zwischenablage kopiert");
  };

  const handleOpenScribe = () => {
    if (sop?.scribeUrl) {
      window.open(sop.scribeUrl, "_blank");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 pb-24 md:pb-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-[600px] rounded-xl" />
      </div>
    );
  }

  if (!sop) {
    return (
      <div className="text-center py-12">
        <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-medium mb-2">SOP nicht gefunden</h2>
        <p className="text-muted-foreground mb-4">
          Die angeforderte SOP existiert nicht.
        </p>
        <Button variant="outline" onClick={() => setLocation("/sops")}>
          Zurück zu SOPs
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 md:pb-6">
      {/* Header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/sops")}
          className="mb-4 -ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück zu SOPs
        </Button>

        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {sopCategory && (
                <span className="text-xs bg-green-500/10 text-green-600 px-2 py-1 rounded-full">
                  {sopCategory.name}
                </span>
              )}
              {sop.scribeUrl && (
                <span className="text-xs bg-blue-500/10 text-blue-600 px-2 py-1 rounded-full">
                  Scribe
                </span>
              )}
              {sop.pdfUrl && (
                <span className="text-xs bg-orange-500/10 text-orange-600 px-2 py-1 rounded-full">
                  PDF
                </span>
              )}
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">{sop.title}</h1>
            {sop.description && (
              <div className="prose prose-sm dark:prose-invert max-w-none mt-4">
                <Streamdown>{sop.description}</Streamdown>
              </div>
            )}
            <p className="text-sm text-muted-foreground mt-3">
              Aktualisiert{" "}
              {formatDistanceToNow(new Date(sop.updatedAt), {
                addSuffix: true,
                locale: de,
              })}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-2" />
              Teilen
            </Button>
            {sop.scribeUrl && (
              <Button variant="outline" size="sm" onClick={handleOpenScribe}>
                <ExternalLink className="h-4 w-4 mr-2" />
                In Scribe öffnen
              </Button>
            )}
            {isEditor && (
              <Button size="sm" onClick={() => setLocation(`/sops/edit/${sop.slug}`)}>
                <Edit className="h-4 w-4 mr-2" />
                Bearbeiten
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* PDF Content */}
      {sop.pdfUrl && (
        <Card className="card-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-primary" />
                <div>
                  <h3 className="font-medium">{sop.pdfFileName || "PDF-Dokument"}</h3>
                  <p className="text-sm text-muted-foreground">PDF-Anleitung</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href={sop.pdfUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Öffnen
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href={sop.pdfUrl} download={sop.pdfFileName || "sop.pdf"}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </a>
                </Button>
              </div>
            </div>
            <div className="w-full bg-muted rounded-lg overflow-hidden">
              <iframe
                src={sop.pdfUrl}
                width="100%"
                height="600"
                className="w-full min-h-[400px] lg:min-h-[600px]"
                title={sop.pdfFileName || "PDF-Dokument"}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scribe Content */}
      {scribeEmbedUrl ? (
        <Card className="card-shadow overflow-hidden">
          <CardContent className="p-0">
            <div ref={scribeContainerRef} className="w-full">
              <iframe
                src={scribeEmbedUrl}
                width="100%"
                height="800"
                allowFullScreen
                frameBorder="0"
                className="w-full min-h-[600px] lg:min-h-[800px]"
                title={sop.title}
                loading="lazy"
              />
            </div>
          </CardContent>
        </Card>
      ) : sop.scribeEmbedCode ? (
        <Card className="card-shadow overflow-hidden">
          <CardContent className="p-0">
            <div
              ref={scribeContainerRef}
              className="w-full"
              dangerouslySetInnerHTML={{ __html: sop.scribeEmbedCode }}
            />
          </CardContent>
        </Card>
      ) : (
        <Card className="card-shadow">
          <CardContent className="p-8 text-center">
            <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {sop.pdfUrl ? "Kein zusätzlicher Scribe-Inhalt für diese SOP hinterlegt." : "Kein Inhalt für diese SOP hinterlegt."}
            </p>
            {isEditor && !sop.pdfUrl && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setLocation(`/sops/edit/${sop.slug}`)}
              >
                Inhalt hinzufügen
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Additional Info */}
      {!scribeEmbedUrl && !sop.scribeEmbedCode && sop.scribeUrl && (
        <Card className="card-shadow">
          <CardContent className="p-6">
            <h3 className="font-medium mb-2">Scribe-Link</h3>
            <a
              href={sop.scribeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline flex items-center gap-2"
            >
              {sop.scribeUrl}
              <ExternalLink className="h-4 w-4" />
            </a>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
