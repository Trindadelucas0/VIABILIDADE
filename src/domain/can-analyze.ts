import { Decimal, isPresentRate } from "./money";

export type CanAnalyzeInput = {
  name: string | null | undefined;
  fairPriceUsd: Decimal | null;
  currency: string | null | undefined;
  brazilPriceBrl: Decimal | null;
  supplierName: string | null | undefined;
  exchangeRate: Decimal | null;
  importTaxRate: Decimal | null;
  nationalizationRate: Decimal | null;
  freightRate: Decimal | null;
};

export type CanAnalyzeResult = {
  ok: boolean;
  missing: string[];
};

function positive(value: Decimal | null): boolean {
  return value instanceof Decimal && value.isFinite() && value.gt(0);
}

export function canAnalyze(input: CanAnalyzeInput): CanAnalyzeResult {
  const missing: string[] = [];

  if (!input.name || input.name.trim().length === 0) {
    missing.push("Nome do produto");
  }
  if (!positive(input.fairPriceUsd)) {
    missing.push("Preço na feira");
  }
  if ((input.currency ?? "").trim().toUpperCase() !== "USD") {
    missing.push("Moeda USD");
  }
  if (!positive(input.brazilPriceBrl)) {
    missing.push("Preço no Brasil");
  }
  if (!input.supplierName || input.supplierName.trim().length === 0) {
    missing.push("Nome do fornecedor");
  }
  if (!positive(input.exchangeRate)) {
    missing.push("Câmbio nos parâmetros");
  }
  if (!isPresentRate(input.importTaxRate) || input.importTaxRate.lt(0)) {
    missing.push("Alíquota de importação");
  }
  if (!isPresentRate(input.nationalizationRate) || input.nationalizationRate.lt(0)) {
    missing.push("Alíquota de nacionalização");
  }
  if (!isPresentRate(input.freightRate) || input.freightRate.lt(0)) {
    missing.push("Alíquota de frete");
  }

  return { ok: missing.length === 0, missing };
}
