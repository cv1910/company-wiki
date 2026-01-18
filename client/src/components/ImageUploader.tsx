import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Image, Upload, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageUploaderProps {
  onUpload: (url: string, markdown: string) => void;
  className?: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

export default function ImageUploader({ onUpload, className }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);

  const uploadMedia = trpc.media.upload.useMutation();

  const uploadToS3 = async (file: File): Promise<{ url: string; fileKey: string }> => {
    // Get presigned URL from backend
    const formData = new FormData();
    formData.append("file", file);

    // Use the storage API endpoint
    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Upload failed");
    }

    return response.json();
  };

  const handleFile = useCallback(
    async (file: File) => {
      // Validate file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error("Ungültiger Dateityp. Erlaubt sind: JPG, PNG, GIF, WebP");
        return;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        toast.error("Datei zu groß. Maximale Größe: 5MB");
        return;
      }

      setIsUploading(true);
      setUploadProgress(10);

      try {
        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => setPreview(e.target?.result as string);
        reader.readAsDataURL(file);

        setUploadProgress(30);

        // Upload to S3
        const { url, fileKey } = await uploadToS3(file);
        setUploadProgress(70);

        // Get image dimensions
        const img = new window.Image();
        img.src = URL.createObjectURL(file);
        await new Promise((resolve) => {
          img.onload = resolve;
        });

        // Save media metadata
        await uploadMedia.mutateAsync({
          filename: fileKey.split("/").pop() || file.name,
          originalFilename: file.name,
          mimeType: file.type,
          size: file.size,
          url,
          fileKey,
          width: img.width,
          height: img.height,
        });

        setUploadProgress(100);

        // Generate markdown
        const markdown = `![${file.name}](${url})`;
        onUpload(url, markdown);

        toast.success("Bild erfolgreich hochgeladen");

        // Reset after short delay
        setTimeout(() => {
          setPreview(null);
          setUploadProgress(0);
          setIsUploading(false);
        }, 500);
      } catch (error) {
        console.error("Upload error:", error);
        toast.error("Fehler beim Hochladen des Bildes");
        setIsUploading(false);
        setUploadProgress(0);
        setPreview(null);
      }
    },
    [onUpload, uploadMedia]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      const imageFile = files.find((f) => ALLOWED_TYPES.includes(f.type));

      if (imageFile) {
        handleFile(imageFile);
      } else if (files.length > 0) {
        toast.error("Bitte nur Bilder hochladen (JPG, PNG, GIF, WebP)");
      }
    },
    [handleFile]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
      // Reset input
      e.target.value = "";
    },
    [handleFile]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = Array.from(e.clipboardData.items);
      const imageItem = items.find((item) => item.type.startsWith("image/"));

      if (imageItem) {
        const file = imageItem.getAsFile();
        if (file) {
          e.preventDefault();
          handleFile(file);
        }
      }
    },
    [handleFile]
  );

  return (
    <div
      className={cn(
        "relative rounded-xl border-2 border-dashed transition-all duration-200",
        isDragging
          ? "border-primary bg-primary/5 scale-[1.02]"
          : "border-muted-foreground/25 hover:border-muted-foreground/50",
        isUploading && "pointer-events-none",
        className
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onPaste={handlePaste}
    >
      <input
        type="file"
        accept={ALLOWED_TYPES.join(",")}
        onChange={handleFileSelect}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        disabled={isUploading}
      />

      <div className="p-6 flex flex-col items-center justify-center gap-3 text-center">
        {isUploading ? (
          <>
            {preview ? (
              <div className="relative w-20 h-20 rounded-lg overflow-hidden">
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                </div>
              </div>
            ) : (
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
            )}
            <div className="w-full max-w-xs">
              <Progress value={uploadProgress} className="h-2" />
              <p className="text-sm text-muted-foreground mt-2">
                Wird hochgeladen... {uploadProgress}%
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="p-3 rounded-full bg-muted">
              <Upload className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">Bild hochladen</p>
              <p className="text-sm text-muted-foreground mt-1">
                Ziehen Sie ein Bild hierher oder klicken Sie zum Auswählen
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                JPG, PNG, GIF, WebP • Max. 5MB
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Inline drop zone for the editor
export function EditorDropZone({
  onUpload,
  children,
}: {
  onUpload: (url: string, markdown: string) => void;
  children: React.ReactNode;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const uploadMedia = trpc.media.upload.useMutation();

  const uploadToS3 = async (file: File): Promise<{ url: string; fileKey: string }> => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Upload failed");
    }

    return response.json();
  };

  const handleFile = async (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Ungültiger Dateityp");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error("Datei zu groß (max. 5MB)");
      return;
    }

    setIsUploading(true);

    try {
      const { url, fileKey } = await uploadToS3(file);

      const img = new window.Image();
      img.src = URL.createObjectURL(file);
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      await uploadMedia.mutateAsync({
        filename: fileKey.split("/").pop() || file.name,
        originalFilename: file.name,
        mimeType: file.type,
        size: file.size,
        url,
        fileKey,
        width: img.width,
        height: img.height,
      });

      const markdown = `![${file.name}](${url})`;
      onUpload(url, markdown);
      toast.success("Bild eingefügt");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Upload fehlgeschlagen");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find((f) => ALLOWED_TYPES.includes(f.type));

    if (imageFile) {
      handleFile(imageFile);
    }
  };

  return (
    <div
      className="relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {children}

      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded-xl flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-background/95 backdrop-blur-sm rounded-xl p-6 shadow-lg text-center">
            <Image className="h-10 w-10 text-primary mx-auto mb-2" />
            <p className="font-medium">Bild hier ablegen</p>
          </div>
        </div>
      )}

      {/* Upload indicator */}
      {isUploading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-xl flex items-center justify-center z-50">
          <div className="flex items-center gap-3">
            <Loader2 className="h-6 w-6 text-primary animate-spin" />
            <span className="font-medium">Bild wird hochgeladen...</span>
          </div>
        </div>
      )}
    </div>
  );
}
