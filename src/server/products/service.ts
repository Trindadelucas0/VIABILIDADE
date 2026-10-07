import type { Prisma } from "@prisma/client";
import { canAnalyze } from "../../domain/can-analyze";
import { Decimal } from "../../domain/money";
import { deriveProductStatus } from "../../domain/product-status";
import type { Actor } from "../auth/actor";
import { productAccessWhere, productWhere, supplierAccessWhere, type Visibility } from "../auth/scope";
import { withActor, type Tx } from "../db";
import { AppError, audit } from "../errors";
import { removeProductImage } from "../images/storage";
import { parseMoney } from "../money-input";
import { completenessOf } from "../analysis/create-analysis";
import type { Supplier } from "@prisma/client";
import { serializeAnalysis } from "../analysis/serialize";
import { currentParameters, rateOrNull } from "../parameters/service";

const detailInclude = {
  supplier: true,
  images: { orderBy: { sortOrder: "asc" as const } },
  analyses: { orderBy: { sequence: "desc" as const }, include: { snapshot: true } },
} satisfies Prisma.ProductInclude;

type Detail = Prisma.ProductGetPayload<{ include: typeof detailInclude }>;

function moneyOut(value: { toString(): string } | null): string | null {
  if (value == null) return null;
  return new Decimal(value.toString()).toDecimalPlaces(4).toFixed(4);
}

function serializeSupplier(supplier: Detail["supplier"]) {
  if (!supplier) return null;
  return {
    id: supplier.id,
    number: supplier.number,
    name: supplier.name,
    phone: supplier.phone,
    notes: supplier.notes,
  };
}

export function serializeProduct(product: Detail, parameters: Awaited<ReturnType<typeof currentParameters>>) {
  const check = canAnalyze(completenessOf(product, parameters));
  const latest = product.analyses[0] ?? null;
  return {
    id: product.id,
    name: product.name,
    code: product.code,
    segment: product.segment,
    stand: product.stand,
    notes: product.notes,
    fair_price_usd: moneyOut(product.fairPriceUsd),
    currency: product.currency,
    brazil_price_brl: moneyOut(product.brazilPriceBrl),
    brazil_price_notes: product.brazilPriceNotes,
    brazil_price_reference: product.brazilPriceReference,
    status: product.status,
    created_by: product.createdBy,
    created_at: product.createdAt.toISOString(),
    updated_at: product.updatedAt.toISOString(),
    can_analyze: check.ok && product.status !== "ARCHIVED",
    missing: product.status === "ARCHIVED" ? [] : check.missing,
    supplier: serializeSupplier(product.supplier),
    images: product.images.map((image) => ({
      id: image.id,
      mime_type: image.mimeType,
      sort_order: image.sortOrder,
      url: `/api/products/${product.id}/images/${image.id}`,
    })),
    analyses: product.analyses.map(serializeAnalysis),
    latest_analysis: latest
      ? {
          id: latest.id,
          sequence: latest.sequence,
          margin: new Decimal(latest.netMargin.toString()).toDecimalPlaces(6).toFixed(6),
          classification: latest.classification,
          parameter_version: latest.parameterVersion,
          final_cost_brl: moneyOut(latest.finalCostBrl),
          net_result_brl: moneyOut(latest.netResultBrl),
          market_price_brl: moneyOut(latest.marketPriceBrl),
        }
      : null,
  };
}

export function serializeProductCard(product: Detail, parameters: Awaited<ReturnType<typeof currentParameters>>) {
  const full = serializeProduct(product, parameters);
  return {
    id: full.id,
    name: full.name,
    segment: full.segment,
    stand: full.stand,
    status: full.status,
    currency: full.currency,
    fair_price_usd: full.fair_price_usd,
    brazil_price_brl: full.brazil_price_brl,
    supplier_name: full.supplier?.name ?? null,
    cover_image_id: full.images[0]?.id ?? null,
    can_analyze: full.can_analyze,
    missing: full.missing,
    latest_analysis: full.latest_analysis,
    created_by: full.created_by,
  };
}

type ProductInput = {
  name?: string;
  code?: string | null;
  segment?: string | null;
  stand?: string | null;
  notes?: string | null;
  fair_price_usd?: string | null;
  currency?: string;
  brazil_price_brl?: string | null;
  brazil_price_notes?: string | null;
  brazil_price_reference?: string | null;
  supplier_id?: string | null;
  supplier?: {
    number?: string | null;
    name?: string | null;
    phone?: string | null;
    notes?: string | null;
  } | null;
  archive?: boolean;
};

function emptyToNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

type ResolvedSupplier = { id: string | null; supplier: Supplier | null };

async function resolveSupplier(
  tx: Tx,
  actor: Actor,
  input: ProductInput,
  currentSupplierId: string | null,
): Promise<ResolvedSupplier> {
  if (input.supplier_id) {
    const supplier = await tx.supplier.findFirst({ where: supplierAccessWhere(actor, input.supplier_id) });
    if (!supplier) throw new AppError(404, "NOT_FOUND", "Fornecedor não encontrado.");
    if (input.supplier && (input.supplier.name || input.supplier.phone || input.supplier.number || input.supplier.notes)) {
      const updated = await tx.supplier.update({
        where: { id: supplier.id },
        data: {
          ...(input.supplier.name != null ? { name: input.supplier.name.trim() || supplier.name } : {}),
          ...(input.supplier.number !== undefined ? { number: emptyToNull(input.supplier.number) } : {}),
          ...(input.supplier.phone !== undefined ? { phone: emptyToNull(input.supplier.phone) } : {}),
          ...(input.supplier.notes !== undefined ? { notes: emptyToNull(input.supplier.notes) } : {}),
        },
      });
      return { id: updated.id, supplier: updated };
    }
    return { id: supplier.id, supplier };
  }

  const name = input.supplier?.name?.trim() ?? "";
  if (!name) return { id: currentSupplierId, supplier: null };
  const created = await tx.supplier.create({
    data: {
      name,
      number: emptyToNull(input.supplier?.number),
      phone: emptyToNull(input.supplier?.phone),
      notes: emptyToNull(input.supplier?.notes),
      createdBy: actor.id,
    },
  });
  return { id: created.id, supplier: created };
}

async function refreshStatus(tx: Tx, actor: Actor, productId: string, archived: boolean) {
  const product = await tx.product.findFirst({
    where: productAccessWhere(actor, productId),
    include: { supplier: true, analyses: { select: { id: true } } },
  });
  if (!product) throw new AppError(404, "NOT_FOUND", "Produto não encontrado.");
  const parameters = await currentParameters(tx);
  const check = canAnalyze(completenessOf(product, parameters));
  const status = deriveProductStatus({
    archived,
    analysisCount: product.analyses.length,
    canAnalyze: check.ok,
  });
  return tx.product.update({
    where: { id: product.id },
    data: { status },
    include: detailInclude,
  });
}

function scalarData(input: ProductInput): Prisma.ProductUncheckedUpdateInput {
  const data: Prisma.ProductUncheckedUpdateInput = {};
  if (input.name !== undefined) data.name = input.name.trim();
  if (input.code !== undefined) data.code = emptyToNull(input.code);
  if (input.segment !== undefined) data.segment = emptyToNull(input.segment);
  if (input.stand !== undefined) data.stand = emptyToNull(input.stand);
  if (input.notes !== undefined) data.notes = emptyToNull(input.notes);
  if (input.fair_price_usd !== undefined) {
    const amount = parseMoney(input.fair_price_usd, "fair_price_usd");
    data.fairPriceUsd = amount ? amount.toFixed(4) : null;
  }
  if (input.currency !== undefined) data.currency = input.currency.trim().toUpperCase() || "USD";
  if (input.brazil_price_brl !== undefined) {
    const amount = parseMoney(input.brazil_price_brl, "brazil_price_brl");
    data.brazilPriceBrl = amount ? amount.toFixed(4) : null;
  }
  if (input.brazil_price_notes !== undefined) data.brazilPriceNotes = emptyToNull(input.brazil_price_notes);
  if (input.brazil_price_reference !== undefined) data.brazilPriceReference = emptyToNull(input.brazil_price_reference);
  return data;
}

export async function createProduct(actor: Actor, input: ProductInput) {
  return withActor(actor, async (tx) => {
    const { id: supplierId, supplier } = await resolveSupplier(tx, actor, input, null);
    const parameters = await currentParameters(tx);
    const draft = {
      name: (input.name ?? "").trim(),
      fairPriceUsd: parseMoney(input.fair_price_usd, "fair_price_usd")?.toFixed(4) ?? null,
      currency: (input.currency ?? "USD").trim().toUpperCase() || "USD",
      brazilPriceBrl: parseMoney(input.brazil_price_brl, "brazil_price_brl")?.toFixed(4) ?? null,
      supplier,
    };
    const check = canAnalyze({
      name: draft.name,
      fairPriceUsd: draft.fairPriceUsd ? new Decimal(draft.fairPriceUsd) : null,
      currency: draft.currency,
      brazilPriceBrl: draft.brazilPriceBrl ? new Decimal(draft.brazilPriceBrl) : null,
      supplierName: supplier?.name ?? null,
      exchangeRate: rateOrNull(parameters?.exchangeRate),
      importTaxRate: rateOrNull(parameters?.importTaxRate),
      nationalizationRate: rateOrNull(parameters?.nationalizationRate),
      freightRate: rateOrNull(parameters?.freightRate),
    });
    const status = deriveProductStatus({
      archived: false,
      analysisCount: 0,
      canAnalyze: check.ok,
    });
    const created = await tx.product.create({
      data: {
        name: draft.name,
        code: emptyToNull(input.code),
        segment: emptyToNull(input.segment),
        stand: emptyToNull(input.stand),
        notes: emptyToNull(input.notes),
        fairPriceUsd: draft.fairPriceUsd,
        currency: draft.currency,
        brazilPriceBrl: draft.brazilPriceBrl,
        brazilPriceNotes: emptyToNull(input.brazil_price_notes),
        brazilPriceReference: emptyToNull(input.brazil_price_reference),
        supplierId,
        createdBy: actor.id,
        status,
      },
    });
    const productForSerialize = {
      ...created,
      supplier,
      images: [],
      analyses: [],
    } as Detail;
    audit("product_created", { userId: actor.id, productId: created.id, status: created.status });
    return serializeProduct(productForSerialize, parameters);
  });
}

export async function updateProduct(actor: Actor, productId: string, input: ProductInput) {
  return withActor(actor, async (tx) => {
    const existing = await tx.product.findFirst({ where: productAccessWhere(actor, productId) });
    if (!existing) throw new AppError(404, "NOT_FOUND", "Produto não encontrado.");
    const { id: supplierId } = await resolveSupplier(tx, actor, input, existing.supplierId);
    await tx.product.update({
      where: { id: existing.id },
      data: { ...scalarData(input), supplierId },
    });
    const archived = input.archive === true || existing.status === "ARCHIVED";
    const product = await refreshStatus(tx, actor, existing.id, archived);
    const parameters = await currentParameters(tx);
    audit("product_updated", { userId: actor.id, productId: product.id, status: product.status });
    return serializeProduct(product, parameters);
  });
}

export async function getProduct(actor: Actor, productId: string) {
  return withActor(actor, async (tx) => {
    const product = await tx.product.findFirst({
      where: productAccessWhere(actor, productId),
      include: detailInclude,
    });
    if (!product) throw new AppError(404, "NOT_FOUND", "Produto não encontrado.");
    const parameters = await currentParameters(tx);
    return serializeProduct(product, parameters);
  });
}

const STATUSES = new Set(["DRAFT", "PENDING", "READY_FOR_ANALYSIS", "ANALYZED", "ARCHIVED"]);
const CLASSES = new Set(["RUIM", "FRACO", "MEDIO", "BOM", "EXCELENTE"]);

export async function listProducts(
  actor: Actor,
  query: { q?: string; status?: string; classificacao?: string; visibility: Visibility },
) {
  return withActor(actor, async (tx) => {
    const where: Prisma.ProductWhereInput = { ...productWhere(actor, query.visibility) };
    if (query.status && STATUSES.has(query.status)) {
      where.status = query.status as Prisma.EnumProductStatusFilter["equals"];
    } else {
      where.status = { not: "ARCHIVED" };
    }
    const q = query.q?.trim();
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { stand: { contains: q, mode: "insensitive" } },
        { segment: { contains: q, mode: "insensitive" } },
        { code: { contains: q, mode: "insensitive" } },
        { supplier: { name: { contains: q, mode: "insensitive" } } },
      ];
    }
    if (query.classificacao && CLASSES.has(query.classificacao)) {
      const ids = await latestIdsByClassification(tx, actor, query.visibility, query.classificacao);
      where.id = { in: ids };
    }
    const [products, parameters] = await Promise.all([
      tx.product.findMany({
        where,
        include: detailInclude,
        orderBy: { updatedAt: "desc" },
        take: 200,
      }),
      currentParameters(tx),
    ]);
    const segments = await tx.product.findMany({
      where: productWhere(actor, query.visibility),
      select: { segment: true },
      distinct: ["segment"],
      take: 50,
    });
    return {
      products: products.map((product) => serializeProductCard(product, parameters)),
      segments: segments.map((row) => row.segment).filter((segment): segment is string => Boolean(segment)),
    };
  });
}

async function latestIdsByClassification(tx: Tx, actor: Actor, visibility: Visibility, classification: string) {
  const mine = actor.role !== "ADMIN" || visibility === "mine";
  const rows = mine
    ? await tx.$queryRaw<{ id: string }[]>`
        SELECT p.id::text AS id
        FROM products p
        WHERE p.created_by = ${actor.id}::uuid
          AND (
            SELECT a.classification::text
            FROM analyses a
            WHERE a.product_id = p.id
            ORDER BY a.sequence DESC
            LIMIT 1
          ) = ${classification}
      `
    : await tx.$queryRaw<{ id: string }[]>`
        SELECT p.id::text AS id
        FROM products p
        WHERE (
          SELECT a.classification::text
          FROM analyses a
          WHERE a.product_id = p.id
          ORDER BY a.sequence DESC
          LIMIT 1
        ) = ${classification}
      `;
  return rows.map((row) => row.id);
}

export async function deleteProduct(actor: Actor, productId: string) {
  if (actor.role !== "ADMIN") {
    throw new AppError(403, "FORBIDDEN", "Só o administrador exclui um produto.");
  }
  const removed = await withActor(actor, async (tx) => {
    const product = await tx.product.findFirst({
      where: productAccessWhere(actor, productId),
      include: { images: true, analyses: { select: { snapshotId: true } } },
    });
    if (!product) throw new AppError(404, "NOT_FOUND", "Produto não encontrado.");
    const snapshotIds = product.analyses.map((analysis) => analysis.snapshotId);
    const keys = product.images.map((image) => image.storageKey);
    await tx.product.delete({ where: { id: product.id } });
    if (snapshotIds.length > 0) {
      await tx.analysisParameterSnapshot.deleteMany({ where: { id: { in: snapshotIds } } });
    }
    return { id: product.id, keys };
  });
  for (const key of removed.keys) {
    await removeProductImage(key);
  }
  audit("product_deleted", { userId: actor.id, productId: removed.id });
  return { id: removed.id };
}
