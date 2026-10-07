import { AppError } from "../errors";

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_IMAGES_PER_PRODUCT = 10;

export type DetectedImage = {
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  extension: "jpg" | "png" | "webp";
};

function startsWith(buffer: Buffer, bytes: number[]): boolean {
  if (buffer.length < bytes.length) return false;
  return bytes.every((byte, index) => buffer[index] === byte);
}

export function detectImage(buffer: Buffer): DetectedImage {
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new AppError(413, "IMAGE_TOO_LARGE", "A imagem passa de 8 MB.");
  }
  if (startsWith(buffer, [0xff, 0xd8, 0xff])) {
    return { mimeType: "image/jpeg", extension: "jpg" };
  }
  if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { mimeType: "image/png", extension: "png" };
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return { mimeType: "image/webp", extension: "webp" };
  }
  throw new AppError(415, "IMAGE_TYPE", "Envie uma imagem JPEG, PNG ou WEBP.");
}
