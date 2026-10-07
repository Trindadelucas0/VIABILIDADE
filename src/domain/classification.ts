import { Decimal } from "./money";

export const CLASSIFICATIONS = ["RUIM", "FRACO", "MEDIO", "BOM", "EXCELENTE"] as const;

export type Classification = (typeof CLASSIFICATIONS)[number];

export const CLASSIFICATION_LABEL: Record<Classification, string> = {
  RUIM: "Ruim",
  FRACO: "Fraco",
  MEDIO: "Médio",
  BOM: "Bom",
  EXCELENTE: "Excelente",
};

export const CLASSIFICATION_HINT: Record<Classification, string> = {
  RUIM: "Não compensa nas premissas atuais",
  FRACO: "Margem apertada; renegociar custo",
  MEDIO: "Avaliar giro, garantia e risco",
  BOM: "Operação atrativa",
  EXCELENTE: "Prioridade para validação comercial",
};

/**
 * Até 10% RUIM; >10% e <15% FRACO; >=15% e <20% MÉDIO;
 * >=20% e <25% BOM; >=25% EXCELENTE.
 * Margem negativa cai em RUIM.
 */
export function classify(margin: Decimal): Classification {
  if (!margin.isFinite()) {
    throw new Error("Margem inválida.");
  }
  if (margin.lte("0.10")) return "RUIM";
  if (margin.lt("0.15")) return "FRACO";
  if (margin.lt("0.20")) return "MEDIO";
  if (margin.lt("0.25")) return "BOM";
  return "EXCELENTE";
}
