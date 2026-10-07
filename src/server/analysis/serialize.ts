import type { Analysis, AnalysisParameterSnapshot } from "@prisma/client";
import { Decimal } from "../../domain/money";

function money(value: { toString(): string }): string {
  return new Decimal(value.toString()).toDecimalPlaces(4).toFixed(4);
}

function rate(value: { toString(): string }): string {
  return new Decimal(value.toString()).toDecimalPlaces(6).toFixed(6);
}

export function serializeAnalysis(row: Analysis & { snapshot: AnalysisParameterSnapshot }) {
  return {
    id: row.id,
    product_id: row.productId,
    sequence: row.sequence,
    created_at: row.createdAt.toISOString(),
    created_by: row.createdBy,
    parameter_version: row.parameterVersion,
    classification: row.classification,
    margin: rate(row.netMargin),
    composition: {
      fair_price_usd: money(row.fairPriceUsd),
      market_price_brl: money(row.marketPriceBrl),
      exchange_rate: rate(row.snapshot.exchangeRate),
      import_tax_rate: rate(row.snapshot.importTaxRate),
      nationalization_rate: rate(row.snapshot.nationalizationRate),
      freight_rate: rate(row.snapshot.freightRate),
      sales_tax_rate: rate(row.snapshot.salesTaxRate),
      operational_cost_rate: rate(row.snapshot.operationalCostRate),
      fob_brl: money(row.fobBrl),
      import_tax_brl: money(row.importTaxBrl),
      nationalization_brl: money(row.nationalizationBrl),
      freight_other_brl: money(row.freightOtherBrl),
      final_cost_brl: money(row.finalCostBrl),
      gross_result_brl: money(row.grossResultBrl),
      sales_tax_brl: money(row.salesTaxBrl),
      operational_cost_brl: money(row.operationalCostBrl),
      net_result_brl: money(row.netResultBrl),
    },
  };
}
