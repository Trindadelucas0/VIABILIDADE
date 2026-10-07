import type { Classification, ProductStatus } from "./types";

export const STATUS_LABEL: Record<ProductStatus, string> = {
  DRAFT: "Rascunho",
  PENDING: "Pendente",
  READY_FOR_ANALYSIS: "Pronto para análise",
  ANALYZED: "Analisado",
  ARCHIVED: "Arquivado",
};

export const CLASS_LABEL: Record<Classification, string> = {
  RUIM: "Ruim",
  FRACO: "Fraco",
  MEDIO: "Médio",
  BOM: "Bom",
  EXCELENTE: "Excelente",
};

export const CLASS_HINT: Record<Classification, string> = {
  RUIM: "Não compensa nas premissas atuais",
  FRACO: "Margem apertada; renegociar custo",
  MEDIO: "Avaliar giro, garantia e risco",
  BOM: "Operação atrativa",
  EXCELENTE: "Prioridade para validação comercial",
};
