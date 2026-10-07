import { AppError } from "./errors";

// 8-4-4-4-12. O terceiro grupo começa com a versão (1–8).
// O quarto grupo tem 4 hex: o primeiro é a variante (8, 9, a ou b) e os outros 3 são livres.
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export function assertUuid(id: string, message: string): void {
  if (!isUuid(id)) {
    throw new AppError(404, "NOT_FOUND", message);
  }
}
