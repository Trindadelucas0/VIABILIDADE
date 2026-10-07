import type { Actor } from "../auth/actor";
import { supplierAccessWhere, supplierWhere } from "../auth/scope";
import { withActor } from "../db";
import { AppError, audit } from "../errors";

function serialize(supplier: {
  id: string;
  number: string | null;
  name: string;
  phone: string | null;
  notes: string | null;
  createdBy: string;
}) {
  return {
    id: supplier.id,
    number: supplier.number,
    name: supplier.name,
    phone: supplier.phone,
    notes: supplier.notes,
    created_by: supplier.createdBy,
  };
}

export async function listSuppliers(actor: Actor) {
  return withActor(actor, async (tx) => {
    const rows = await tx.supplier.findMany({
      where: supplierWhere(actor),
      orderBy: { name: "asc" },
      take: 200,
    });
    return rows.map(serialize);
  });
}

export async function createSupplier(
  actor: Actor,
  input: { name: string; number?: string | null; phone?: string | null; notes?: string | null },
) {
  return withActor(actor, async (tx) => {
    const row = await tx.supplier.create({
      data: {
        name: input.name.trim(),
        number: input.number?.trim() || null,
        phone: input.phone?.trim() || null,
        notes: input.notes?.trim() || null,
        createdBy: actor.id,
      },
    });
    audit("supplier_created", { userId: actor.id, supplierId: row.id });
    return serialize(row);
  });
}

export async function updateSupplier(
  actor: Actor,
  supplierId: string,
  input: { name?: string; number?: string | null; phone?: string | null; notes?: string | null },
) {
  return withActor(actor, async (tx) => {
    const existing = await tx.supplier.findFirst({ where: supplierAccessWhere(actor, supplierId) });
    if (!existing) throw new AppError(404, "NOT_FOUND", "Fornecedor não encontrado.");
    const row = await tx.supplier.update({
      where: { id: existing.id },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.number !== undefined ? { number: input.number?.trim() || null } : {}),
        ...(input.phone !== undefined ? { phone: input.phone?.trim() || null } : {}),
        ...(input.notes !== undefined ? { notes: input.notes?.trim() || null } : {}),
      },
    });
    audit("supplier_updated", { userId: actor.id, supplierId: row.id });
    return serialize(row);
  });
}
