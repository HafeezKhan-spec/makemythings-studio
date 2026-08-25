import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "products");
const CUSTOM_UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "custom-requests");

const IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const VIDEO_MIME = new Set(["video/mp4", "video/webm", "video/quicktime"]);

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 20 * 1024 * 1024;

function extensionForMime(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "video/mp4":
      return "mp4";
    case "video/webm":
      return "webm";
    case "video/quicktime":
      return "mov";
    default:
      return "bin";
  }
}

export async function saveProductMediaFile(
  kind: "image" | "video",
  mimeType: string,
  dataBase64: string,
): Promise<string> {
  const allowed = kind === "image" ? IMAGE_MIME : VIDEO_MIME;
  if (!allowed.has(mimeType)) {
    throw new Error(
      kind === "image"
        ? "Only JPG, PNG, WebP or GIF images are allowed"
        : "Only MP4, WebM or MOV videos are allowed",
    );
  }

  const buffer = Buffer.from(dataBase64, "base64");
  const maxBytes = kind === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
  if (buffer.length > maxBytes) {
    throw new Error(
      kind === "image" ? "Image must be 5 MB or smaller" : "Video must be 20 MB or smaller",
    );
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  const filename = `${randomUUID()}.${extensionForMime(mimeType)}`;
  await writeFile(path.join(UPLOAD_DIR, filename), buffer);
  return `/uploads/products/${filename}`;
}

const STL_MIME = new Set([
  "application/octet-stream",
  "model/stl",
  "application/sla",
  "application/vnd.ms-pki.stl",
]);
const REF_IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function saveCustomRequestFile(
  kind: "model" | "reference",
  mimeType: string,
  fileName: string,
  dataBase64: string,
): Promise<string> {
  const buffer = Buffer.from(dataBase64, "base64");
  const maxBytes = kind === "model" ? 25 * 1024 * 1024 : 8 * 1024 * 1024;
  if (buffer.length > maxBytes) {
    throw new Error(kind === "model" ? "STL file must be 25 MB or smaller" : "Image must be 8 MB or smaller");
  }

  if (kind === "model") {
    const ext = fileName.toLowerCase().split(".").pop();
    if (ext !== "stl" && !STL_MIME.has(mimeType)) {
      throw new Error("Only STL model files are allowed");
    }
  } else if (!REF_IMAGE_MIME.has(mimeType)) {
    throw new Error("Only JPG, PNG, WebP or GIF reference images are allowed");
  }

  await mkdir(CUSTOM_UPLOAD_DIR, { recursive: true });
  const safeExt =
    kind === "model"
      ? "stl"
      : extensionForMime(mimeType);
  const filename = `${randomUUID()}.${safeExt}`;
  await writeFile(path.join(CUSTOM_UPLOAD_DIR, filename), buffer);
  return `/uploads/custom-requests/${filename}`;
}
