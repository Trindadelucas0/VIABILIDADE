import type { FinancialParameter } from "@prisma/client";
import { Decimal } from "../../domain/money";
import { AppError } from "../errors";
import { parseExchange, parsePercentRate } from "../money-input";
import type { Tx } from "../db";

export async function currentParameters(tx: Tx): Promise<FinancialParameter | null> {
  return tx.financialParameter.findFirst({ orderBy: { version: "desc" } });
}

export function rateOrNull(value: { toString(): string } | null | undefined): Decimal | null {
  if (value == null) return null;
  return new Decimal(value.toString());
}

export function percentString(value: { toString(): string } | null | undefined): string | null {
  if (value == null) return null;
  return new Decimal(value.toString()).mul(100).toDecimalPlaces(4).toString();
}

export function serializeParameters(row: FinancialParameter) {
  return {
    id: row.id,
    version: row.version,
    exchange_rate: row.exchangeRate ? new Decimal(row.exchangeRate.toString()).toFixed(6) : null,
    import_tax_percent: percentString(row.importTaxRate),
    nationalization_percent: percentString(row.nationalizationRate),
    freight_percent: percentString(row.freightRate),
    sales_tax_percent: percentString(row.salesTaxRate),
    operational_cost_percent: percentString(row.operationalCostRate),
    updated_at: row.updatedAt.toISOString(),
  };
}

export function assertAdmin(role: string) {
  if (role !== "ADMIN") {
    throw new AppError(403, "FORBIDDEN", "Só o administrador altera os parâmetros.");
  }
}

export function parseParameterPatch(input: {
  exchange_rate: string;
  import_tax_percent: string;
  nationalization_percent: string;
  freight_percent: string;
  sales_tax_percent: string;
  operational_cost_percent: string;
}) {
  const exchangeRate = parseExchange(input.exchange_rate);
  if (!exchangeRate) {
    throw new AppError(422, "VALIDATION", "Informe o câmbio.", {
      fields: { exchange_rate: "Informe quantos reais valem 1 dólar." },
    });
  }
  const importTaxRate = parsePercentRate(input.import_tax_percent, "import_tax_percent", true);
  const nationalizationRate = parsePercentRate(input.nationalization_percent, "nationalization_percent", true);
  const freightRate = parsePercentRate(input.freight_percent, "freight_percent", true);
  const salesTaxRate = parsePercentRate(input.sales_tax_percent, "sales_tax_percent", true);
  const operationalCostRate = parsePercentRate(input.operational_cost_percent, "operational_cost_percent", true);
  if (!importTaxRate || !nationalizationRate || !freightRate || !salesTaxRate || !operationalCostRate) {
    throw new AppError(422, "VALIDATION", "Revise os percentuais.");
  }
  return {
    exchangeRate: exchangeRate.toFixed(6),
    importTaxRate: importTaxRate.toFixed(6),
    nationalizationRate: nationalizationRate.toFixed(6),
    freightRate: freightRate.toFixed(6),
    salesTaxRate: salesTaxRate.toFixed(6),
    operationalCostRate: operationalCostRate.toFixed(6),
  };
}
