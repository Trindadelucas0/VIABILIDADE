import { canAnalyze, type CanAnalyzeInput } from "./can-analyze";
import { classify, type Classification } from "./classification";
import { Decimal, money, rate } from "./money";

export class AnalysisRejected extends Error {
  readonly missing: string[];

  constructor(missing: string[]) {
    super("Não é possível analisar.");
    this.name = "AnalysisRejected";
    this.missing = missing;
  }
}

export type AnalysisParameters = {
  exchangeRate: Decimal;
  importTaxRate: Decimal;
  nationalizationRate: Decimal;
  freightRate: Decimal;
  salesTaxRate: Decimal;
  operationalCostRate: Decimal;
  parameterVersion: number;
};

export type AnalysisRequest = {
  fairPriceUsd: Decimal;
  brazilPriceBrl: Decimal;
  parameters: AnalysisParameters;
  completeness: CanAnalyzeInput;
};

export type AnalysisComposition = {
  fairPriceUsd: string;
  marketPriceBrl: string;
  exchangeRate: string;
  importTaxRate: string;
  nationalizationRate: string;
  freightRate: string;
  salesTaxRate: string;
  operationalCostRate: string;
  fobBrl: string;
  importTaxBrl: string;
  nationalizationBrl: string;
  freightOtherBrl: string;
  finalCostBrl: string;
  grossResultBrl: string;
  salesTaxBrl: string;
  operationalCostBrl: string;
  netResultBrl: string;
};

export type AnalysisOutcome = {
  margin: string;
  marginDecimal: Decimal;
  classification: Classification;
  parameterVersion: number;
  composition: AnalysisComposition;
};

function requireSalesRates(parameters: AnalysisParameters): void {
  if (!parameters.salesTaxRate.isFinite() || parameters.salesTaxRate.lt(0)) {
    throw new AnalysisRejected(["Imposto sobre venda"]);
  }
  if (!parameters.operationalCostRate.isFinite() || parameters.operationalCostRate.lt(0)) {
    throw new AnalysisRejected(["Custo operacional"]);
  }
}

/**
 * Única função que produz margem e classificação.
 *
 * fob_brl = preco_usd * cambio
 * imposto = fob_brl * aliquota_importacao
 * nacionalizacao = fob_brl * aliquota_nacionalizacao
 * frete = fob_brl * aliquota_frete
 * custo_final = soma
 * resultado_bruto = preco_brasil - custo_final
 * imposto_venda = preco_brasil * aliquota_venda
 * custo_operacional = preco_brasil * aliquota_operacional
 * resultado_liquido = resultado_bruto - imposto_venda - custo_operacional
 * margem = resultado_liquido / preco_brasil
 */
export function analyze(request: AnalysisRequest): AnalysisOutcome {
  const check = canAnalyze(request.completeness);
  if (!check.ok) {
    throw new AnalysisRejected(check.missing);
  }
  requireSalesRates(request.parameters);

  const fair = request.fairPriceUsd;
  const brazil = request.brazilPriceBrl;
  const parameters = request.parameters;

  const fobBrl = fair.mul(parameters.exchangeRate);
  const importTaxBrl = fobBrl.mul(parameters.importTaxRate);
  const nationalizationBrl = fobBrl.mul(parameters.nationalizationRate);
  const freightOtherBrl = fobBrl.mul(parameters.freightRate);
  const finalCostBrl = fobBrl.plus(importTaxBrl).plus(nationalizationBrl).plus(freightOtherBrl);
  const grossResultBrl = brazil.minus(finalCostBrl);
  const salesTaxBrl = brazil.mul(parameters.salesTaxRate);
  const operationalCostBrl = brazil.mul(parameters.operationalCostRate);
  const netResultBrl = grossResultBrl.minus(salesTaxBrl).minus(operationalCostBrl);
  const marginDecimal = netResultBrl.div(brazil);

  return {
    margin: rate(marginDecimal),
    marginDecimal,
    classification: classify(marginDecimal),
    parameterVersion: parameters.parameterVersion,
    composition: {
      fairPriceUsd: money(fair),
      marketPriceBrl: money(brazil),
      exchangeRate: rate(parameters.exchangeRate),
      importTaxRate: rate(parameters.importTaxRate),
      nationalizationRate: rate(parameters.nationalizationRate),
      freightRate: rate(parameters.freightRate),
      salesTaxRate: rate(parameters.salesTaxRate),
      operationalCostRate: rate(parameters.operationalCostRate),
      fobBrl: money(fobBrl),
      importTaxBrl: money(importTaxBrl),
      nationalizationBrl: money(nationalizationBrl),
      freightOtherBrl: money(freightOtherBrl),
      finalCostBrl: money(finalCostBrl),
      grossResultBrl: money(grossResultBrl),
      salesTaxBrl: money(salesTaxBrl),
      operationalCostBrl: money(operationalCostBrl),
      netResultBrl: money(netResultBrl),
    },
  };
}
