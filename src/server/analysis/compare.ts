import { Decimal } from "../../domain/money";
import type { Actor } from "../auth/actor";
import { productWhere } from "../auth/scope";
import { withActor } from "../db";
import { createAnalysis } from "./create-analysis";
import { AppError } from "../errors";

function money(value: { toString(): string }): string {
  return new Decimal(value.toString()).toDecimalPlaces(4).toFixed(4);
}

export async function compareProducts(actor: Actor, ids: string[]) {
  return withActor(actor, async (tx) => {
    const visibility = actor.role === "ADMIN" ? "all" : "mine";
    const products = await tx.product.findMany({
      where: { ...productWhere(actor, visibility), id: { in: ids } },
      include: { analyses: { orderBy: { sequence: "desc" }, take: 1 } },
    });
    const byId = new Map(products.map((product) => [product.id, product]));
    return {
      items: ids.map((id) => {
        const product = byId.get(id);
        if (!product) return { id, found: false as const };
        const latest = product.analyses[0];
        if (!latest) {
          return { id, found: true as const, name: product.name, analysis: null };
        }
        return {
          id,
          found: true as const,
          name: product.name,
          analysis: {
            id: latest.id,
            final_cost_brl: money(latest.finalCostBrl),
            market_price_brl: money(latest.marketPriceBrl),
            net_result_brl: money(latest.netResultBrl),
            margin: new Decimal(latest.netMargin.toString()).toDecimalPlaces(6).toFixed(6),
            classification: latest.classification,
            parameter_version: latest.parameterVersion,
          },
        };
      }),
    };
  });
}

export async function analyzeBatch(actor: Actor, ids: string[]) {
  const analyzed = [];
  const skipped: { id: string; reason: string }[] = [];
  for (const id of ids) {
    try {
      analyzed.push(await createAnalysis(actor, id));
    } catch (error) {
      if (error instanceof AppError && (error.status === 404 || error.status === 422)) {
        const reason = error.status === 404 ? "não encontrado" : (error.missing ?? [error.message]).join("; ");
        skipped.push({ id, reason });
        continue;
      }
      throw error;
    }
  }
  return { analyzed, skipped };
}
