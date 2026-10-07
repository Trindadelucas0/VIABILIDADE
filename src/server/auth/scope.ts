import type { Prisma } from "@prisma/client";
import type { Actor } from "./actor";

export type Visibility = "all" | "mine";

export function resolveVisibility(actor: Actor, requested: string | null): Visibility {
  if (actor.role !== "ADMIN") return "mine";
  return requested === "mine" ? "mine" : "all";
}

export function restrictsToOwner(actor: Actor, visibility: Visibility): boolean {
  return actor.role !== "ADMIN" || visibility === "mine";
}

export function productWhere(actor: Actor, visibility: Visibility = "mine"): Prisma.ProductWhereInput {
  if (restrictsToOwner(actor, visibility)) return { createdBy: actor.id };
  return {};
}

export function productAccessWhere(actor: Actor, productId: string): Prisma.ProductWhereInput {
  if (actor.role === "ADMIN") return { id: productId };
  return { id: productId, createdBy: actor.id };
}

export function supplierWhere(actor: Actor): Prisma.SupplierWhereInput {
  if (actor.role === "ADMIN") return {};
  return { createdBy: actor.id };
}

export function supplierAccessWhere(actor: Actor, supplierId: string): Prisma.SupplierWhereInput {
  if (actor.role === "ADMIN") return { id: supplierId };
  return { id: supplierId, createdBy: actor.id };
}
