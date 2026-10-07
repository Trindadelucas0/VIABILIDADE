import { randomUUID } from "crypto";
import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";
import { AppError } from "../errors";

const KEY_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/;

export function storageRoot(): string {
  return path.resolve(process.cwd(), "storage", "products");
}

export function storagePath(storageKey: string): string {
  if (!KEY_PATTERN.test(storageKey)) {
    throw new AppError(404, "NOT_FOUND", "Imagem não encontrada.");
  }
  const root = storageRoot();
  const full = path.resolve(root, storageKey);
  if (full !== path.join(root, storageKey)) {
    throw new AppError(404, "NOT_FOUND", "Imagem não encontrada.");
  }
  return full;
}

export async function saveProductImage(buffer: Buffer, extension: "jpg" | "png" | "webp"): Promise<string> {
  const root = storageRoot();
  await mkdir(root, { recursive: true });
  const storageKey = `${randomUUID()}.${extension}`;
  await writeFile(storagePath(storageKey), buffer, { flag: "wx" });
  return storageKey;
}

export async function readProductImage(storageKey: string): Promise<Buffer> {
  try {
    return await readFile(storagePath(storageKey));
  } catch {
    throw new AppError(404, "NOT_FOUND", "Imagem não encontrada.");
  }
}

export async function removeProductImage(storageKey: string): Promise<void> {
  try {
    await unlink(storagePath(storageKey));
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") {
      console.error(JSON.stringify({ event: "image_unlink_failed", storageKey }));
    }
  }
}
