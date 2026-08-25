import { ImagePlus, Loader2, Play, Trash2, Video } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { uploadProductMedia } from "@/lib/upload.functions";

const MAX_IMAGES = 10;
const MAX_VIDEOS = 3;
const MAX_VIDEO_SECONDS = 15;

type Props = {
  images: string[];
  videos: string[];
  onChange: (next: { images: string[]; videos: string[] }) => void;
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const base64 = result.includes(",") ? result.split(",")[1]! : result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    const objectUrl = URL.createObjectURL(file);
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(video.duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not read video"));
    };
    video.src = objectUrl;
  });
}

export function ProductMediaUploader({ images, videos, onChange }: Props) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function uploadFiles(files: FileList | null, kind: "image" | "video") {
    if (!files?.length) return;

    const currentCount = kind === "image" ? images.length : videos.length;
    const max = kind === "image" ? MAX_IMAGES : MAX_VIDEOS;
    const remaining = max - currentCount;
    if (remaining <= 0) {
      toast.error(`Maximum ${max} ${kind === "image" ? "images" : "videos"} allowed`);
      return;
    }

    const selected = Array.from(files).slice(0, remaining);
    setUploading(true);

    const nextImages = [...images];
    const nextVideos = [...videos];

    try {
      for (const file of selected) {
        if (kind === "image" && !file.type.startsWith("image/")) {
          toast.error(`${file.name} is not a valid image`);
          continue;
        }
        if (kind === "video" && !file.type.startsWith("video/")) {
          toast.error(`${file.name} is not a valid video`);
          continue;
        }

        if (kind === "video") {
          const duration = await getVideoDuration(file);
          if (duration > MAX_VIDEO_SECONDS) {
            toast.error(`${file.name} must be ${MAX_VIDEO_SECONDS} seconds or shorter`);
            continue;
          }
        }

        const dataBase64 = await fileToBase64(file);
        const result = await uploadProductMedia({
          data: {
            kind,
            mimeType: file.type,
            fileName: file.name,
            dataBase64,
          },
        });

        if (result.kind === "image") nextImages.push(result.url);
        else nextVideos.push(result.url);
      }

      onChange({ images: nextImages, videos: nextVideos });
      toast.success("Media uploaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
      if (videoInputRef.current) videoInputRef.current.value = "";
    }
  }

  function removeImage(url: string) {
    onChange({ images: images.filter((item) => item !== url), videos });
  }

  function removeVideo(url: string) {
    onChange({ images, videos: videos.filter((item) => item !== url) });
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-surface/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Product media</p>
          <p className="text-xs text-muted-foreground">
            Up to {MAX_IMAGES} images and {MAX_VIDEOS} short videos (max {MAX_VIDEO_SECONDS}s each)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={(e) => uploadFiles(e.target.files, "image")}
          />
          <input
            ref={videoInputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            multiple
            className="hidden"
            onChange={(e) => uploadFiles(e.target.files, "video")}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="rounded-full"
            disabled={uploading || images.length >= MAX_IMAGES}
            onClick={() => imageInputRef.current?.click()}
          >
            {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" />}
            Upload images
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            disabled={uploading || videos.length >= MAX_VIDEOS}
            onClick={() => videoInputRef.current?.click()}
          >
            {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Video className="mr-2 h-4 w-4" />}
            Upload video
          </Button>
        </div>
      </div>

      {images.length || videos.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {images.map((url) => (
            <div key={url} className="group relative overflow-hidden rounded-xl border border-border bg-background">
              <img src={url} alt="" className="aspect-square w-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(url)}
                className="absolute top-2 right-2 rounded-full bg-background/90 p-1.5 opacity-0 transition-opacity group-hover:opacity-100"
                aria-label="Remove image"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </button>
            </div>
          ))}
          {videos.map((url) => (
            <div key={url} className="group relative overflow-hidden rounded-xl border border-border bg-background">
              <video src={url} className="aspect-square w-full object-cover" muted playsInline />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/25">
                <Play className="h-8 w-8 text-white" />
              </div>
              <button
                type="button"
                onClick={() => removeVideo(url)}
                className="absolute top-2 right-2 rounded-full bg-background/90 p-1.5 opacity-0 transition-opacity group-hover:opacity-100"
                aria-label="Remove video"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex min-h-28 flex-col items-center justify-center rounded-xl border border-dashed border-border text-center text-sm text-muted-foreground">
          <ImagePlus className="mb-2 h-6 w-6" />
          No product media yet. Upload images and a short product video.
        </div>
      )}
    </div>
  );
}
