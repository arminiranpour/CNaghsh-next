import crypto from "node:crypto";
import { existsSync } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";

const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);

function getExtension(mimeType: string): string {
  switch (mimeType) {
    case "image/png":
      return ".png";
    case "image/jpeg":
      return ".jpg";
    case "image/webp":
      return ".webp";
    default:
      throw new Error("نوع فایل پشتیبانی نمی‌شود.");
  }
}

const PUBLIC_DIR = (() => {
  const cwd = process.cwd();
  const direct = path.join(cwd, "public");
  if (existsSync(direct)) {
    return direct;
  }
  return path.join(cwd, "apps", "web", "public");
})();

export async function saveImageFromFormData(
  formData: FormData,
  userId: string,
): Promise<{ url: string }> {
  const file = formData.get("file");

  if (!(file instanceof File)) {
    throw new Error("فایل تصویر یافت نشد.");
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new Error("لطفاً تصویری با فرمت مجاز (PNG، JPEG یا WEBP) بارگذاری کنید.");
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const extension = getExtension(file.type);

  const uploadsDir = path.join(PUBLIC_DIR, "uploads", userId);
  await fs.mkdir(uploadsDir, { recursive: true });

  const fileName = `${Date.now()}-${crypto.randomUUID()}${extension}`;
  const filePath = path.join(uploadsDir, fileName);

  await fs.writeFile(filePath, buffer);

  const url = path.posix.join("/uploads", userId, fileName);
  return { url };
}

export async function deleteByUrl(url: string, userId: string): Promise<void> {
  if (!url.startsWith("/uploads/")) {
    throw new Error("آدرس فایل نامعتبر است.");
  }

  const normalized = url.replace(/^\/+/, "");
  const segments = normalized.split("/");

  if (segments.length < 3 || segments[0] !== "uploads" || segments[1] !== userId) {
    throw new Error("دسترسی به حذف این فایل مجاز نیست.");
  }

  const filePath = path.join(PUBLIC_DIR, normalized);
  await fs.rm(filePath, { force: true });
}
