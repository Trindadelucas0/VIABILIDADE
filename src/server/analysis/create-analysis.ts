import type { FinancialParameter, Product, Supplier } from "@prisma/client";
import { analyze, AnalysisRejected } from "../../domain/analysis-service";
import { canAnalyze } from "../../domain/can-analyze";
import { Decimal } from "../../domain/money";
import { deriveProductStatus } from "../../domain/product-status";
import type { Actor } from "../auth/actor";
import { productAccessWhere } from "../auth/scope";
import { withActor, type Tx } from "../db";
import { AppError, audit } from "../errors";
import { currentParameters, rateOrNull } from "../parameters/service";
import { serializeAnalysis } from "./serialize";

type ProductWithSupplier = Product & { supplier: Supplier | null };

function decimalOrNull(value: { toString(): string } | null): Decimal | null {
  if (value == null) return null;
  return new Decimal(value.toString());
}

export function completenessOf(product: ProductWithSupplier, parameters: FinancialParameter | null) {
  return {
    name: product.name,
    fairPriceUsd: decimalOrNull(product.fairPriceUsd),
    currency: product.currency,
    brazilPriceBrl: decimalOrNull(product.brazilPriceBrl),
    supplierName: product.supplier?.name ?? null,
    exchangeRate: rateOrNull(parameters?.exchangeRate),
    importTaxRate: rateOrNull(parameters?.importTaxRate),
    nationalizationRate: rateOrNull(parameters?.nationalizationRate),
    freightRate: rateOrNull(parameters?.freightRate),
  };
}

async function loadScopedProduct(tx: Tx, actor: Actor, productId: string) {
  const product = await tx.product.findFirst({
    where: productAccessWhere(actor, productId),
    include: { supplier: true, analyses: { select: { id: true } } },
  });
  if (!product) {
    throw new AppError(404, "NOT_FOUND", "Produto não encontrado.");
  }
  return product;
}

export async function createAnalysis(actor: Actor, productId: string) {
  return withActor(actor, async (tx) => {
    const product = await loadScopedProduct(tx, actor, productId);
    if (product.status === "ARCHIVED") {
      throw new AppError(422, "VALIDATION", "Produto arquivado não entra em análise.", {
        missing: ["Produto arquivado"],
      });
    }
    const parameters = await currentParameters(tx);
    const completeness = completenessOf(product, parameters);
    const check = canAnalyze(completeness);
    if (!check.ok || !parameters) {
      const missing = check.missing.length > 0 ? check.missing : ["Câmbio nos parâmetros"];
      const status = deriveProductStatus({
        archived: false,
        analysisCount: product.analyses.length,
        canAnalyze: false,
      });
      await tx.product.update({ where: { id: product.id }, data: { status } });
      throw new AppError(422, "VALIDATION", "Ainda não dá para analisar.", { missing });
    }

    const salesTaxRate = rateOrNull(parameters.salesTaxRate);
    const operationalCostRate = rateOrNull(parameters.operationalCostRate);
    if (!salesTaxRate || !operationalCostRate || !completeness.fairPriceUsd || !completeness.brazilPriceBrl) {
      throw new AppError(422, "VALIDATION", "Ainda não dá para analisar.", {
        missing: check.missing,
      });
    }

    let outcome;
    try {
      outcome = analyze({
        fairPriceUsd: completeness.fairPriceUsd,
        brazilPriceBrl: completeness.brazilPriceBrl,
        completeness,
        parameters: {
          exchangeRate: new Decimal(parameters.exchangeRate!.toString()),
          importTaxRate: new Decimal(parameters.importTaxRate!.toString()),
          nationalizationRate: new Decimal(parameters.nationalizationRate!.toString()),
          freightRate: new Decimal(parameters.freightRate!.toString()),
          salesTaxRate,
          operationalCostRate,
          parameterVersion: parameters.version,
        },
      });
    } catch (error) {
      if (error instanceof AnalysisRejected) {
        throw new AppError(422, "VALIDATION", "Ainda não dá para analisar.", { missing: error.missing });
      }
      throw error;
    }

    const snapshot = await tx.analysisParameterSnapshot.create({
      data: {
        parameterVersion: parameters.version,
        exchangeRate: outcome.composition.exchangeRate,
        importTaxRate: outcome.composition.importTaxRate,
        nationalizationRate: outcome.composition.nationalizationRate,
        freightRate: outcome.composition.freightRate,
        salesTaxRate: outcome.composition.salesTaxRate,
        operationalCostRate: outcome.composition.operationalCostRate,
      },
    });

    const last = await tx.analysis.aggregate({
      where: { productId: product.id },
      _max: { sequence: true },
    });

    const analysis = await tx.analysis.create({
      data: {
        productId: product.id,
        createdBy: actor.id,
        sequence: (last._max.sequence ?? 0) + 1,
        fairPriceUsd: outcome.composition.fairPriceUsd,
        marketPriceBrl: outcome.composition.marketPriceBrl,
        fobBrl: outcome.composition.fobBrl,
        importTaxBrl: outcome.composition.importTaxBrl,
        nationalizationBrl: outcome.composition.nationalizationBrl,
        freightOtherBrl: outcome.composition.freightOtherBrl,
        finalCostBrl: outcome.composition.finalCostBrl,
        grossResultBrl: outcome.composition.grossResultBrl,
        salesTaxBrl: outcome.composition.salesTaxBrl,
        operationalCostBrl: outcome.composition.operationalCostBrl,
        netResultBrl: outcome.composition.netResultBrl,
        netMargin: outcome.margin,
        classification: outcome.classification,
        parameterVersion: outcome.parameterVersion,
        snapshotId: snapshot.id,
      },
      include: { snapshot: true },
    });

    await tx.product.update({
      where: { id: product.id },
      data: { status: "ANALYZED" },
    });

    audit("analysis_created", {
      userId: actor.id,
      productId: product.id,
      analysisId: analysis.id,
      sequence: analysis.sequence,
      parameterVersion: analysis.parameterVersion,
    });

    return serializeAnalysis(analysis);
  });
}
