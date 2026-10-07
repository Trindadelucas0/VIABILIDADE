export const PRODUCT_STATUSES = [
  "DRAFT",
  "PENDING",
  "READY_FOR_ANALYSIS",
  "ANALYZED",
  "ARCHIVED",
] as const;

export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export function deriveProductStatus(input: {
  archived: boolean;
  analysisCount: number;
  canAnalyze: boolean;
}): ProductStatus {
  if (input.archived) return "ARCHIVED";
  if (input.analysisCount > 0) return "ANALYZED";
  if (input.canAnalyze) return "READY_FOR_ANALYSIS";
  return "PENDING";
}
