import { randomBytes } from "node:crypto";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const normalizeExt = (ext: string) => {
  const trimmed = ext.trim();
  if (!trimmed) {
    return "";
  }
  if (trimmed.startsWith(".")) {
    return trimmed;
  }
  return `.${trimmed}`;
};

const createTempFile = async (prefix: string, ext: string) => {
  const suffix = randomBytes(8).toString("hex");
  const filePath = join(tmpdir(), `${prefix}-${Date.now()}-${suffix}${normalizeExt(ext)}`);
  await mkdir(dirname(filePath), { recursive: true });
  return filePath;
};

const createTempDir = async (prefix: string) => {
  return mkdtemp(join(tmpdir(), `${prefix}-`));
};

const cleanupPath = async (path: string) => {
  try {
    await rm(path, { recursive: true, force: true });
  } catch (error) {
    if ((error as { code?: string }).code !== "ENOENT") {
      throw error;
    }
  }
};

export { cleanupPath, createTempDir, createTempFile };
