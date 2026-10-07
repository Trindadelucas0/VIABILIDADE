import { Decimal } from "../../domain/money";
import type { Actor } from "../auth/actor";
import { productWhere, type Visibility } from "../auth/scope";
import { withActor } from "../db";

export async function loadDashboard(actor: Actor, visibility: Visibility) {
  return withActor(actor, async (tx) => {
    const base = { ...productWhere(actor, visibility), status: { not: "ARCHIVED" as const } };
    const [products, pending, analyzed, rows] = await Promise.all([
      tx.product.count({ where: base }),
      tx.product.count({ where: { ...base, status: "PENDING" } }),
      tx.product.count({ where: { ...base, status: "ANALYZED" } }),
      tx.product.findMany({
        where: { ...base, analyses: { some: {} } },
        select: {
          id: true,
          name: true,
          analyses: {
            orderBy: { sequence: "desc" },
            take: 1,
            select: { netMargin: true, classification: true },
          },
        },
      }),
    ]);

    const ranked = rows.flatMap((product) => {
      const latest = product.analyses[0];
      if (!latest) return [];
      return [
        {
          id: product.id,
          name: product.name,
          margin: new Decimal(latest.netMargin.toString()).toDecimalPlaces(6).toFixed(6),
          classification: latest.classification,
        },
      ];
    });

    ranked.sort((a, b) => new Decimal(b.margin).comparedTo(new Decimal(a.margin)));

    return {
      scope: visibility,
      counts: {
        products,
        pending,
        analyzed,
        excellent: ranked.filter((item) => item.classification === "EXCELENTE").length,
      },
      opportunities: ranked.slice(0, 5),
    };
  });
}
