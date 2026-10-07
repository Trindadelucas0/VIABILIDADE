import type { Actor } from "../auth/actor";
import { productAccessWhere } from "../auth/scope";
import { withActor } from "../db";
import { AppError, audit } from "../errors";
import { detectImage, MAX_IMAGES_PER_PRODUCT } from "./validate-image";
import { readProductImage, removeProductImage, saveProductImage } from "./storage";

export async function addProductImage(actor: Actor, productId: string, buffer: Buffer) {
  const detected = detectImage(buffer);
  const created = await withActor(actor, async (tx) => {
    const product = await tx.product.findFirst({
      where: productAccessWhere(actor, productId),
      include: { images: { select: { id: true } } },
    });
    if (!product) throw new AppError(404, "NOT_FOUND", "Produto não encontrado.");
    if (product.images.length >= MAX_IMAGES_PER_PRODUCT) {
      throw new AppError(422, "VALIDATION", "Este produto já tem 10 imagens.");
    }
    const storageKey = await saveProductImage(buffer, detected.extension);
    try {
      return await tx.productImage.create({
        data: {
          productId: product.id,
          storageKey,
          mimeType: detected.mimeType,
          sortOrder: product.images.length,
        },
      });
    } catch (error) {
      await removeProductImage(storageKey);
      throw error;
    }
  });
  audit("image_created", { userId: actor.id, productId, imageId: created.id });
  return {
    id: created.id,
    mime_type: created.mimeType,
    sort_order: created.sortOrder,
    url: `/api/products/${productId}/images/${created.id}`,
  };
}

export async function listProductImages(actor: Actor, productId: string) {
  return withActor(actor, async (tx) => {
    const product = await tx.product.findFirst({
      where: productAccessWhere(actor, productId),
      include: { images: { orderBy: { sortOrder: "asc" } } },
    });
    if (!product) throw new AppError(404, "NOT_FOUND", "Produto não encontrado.");
    return product.images.map((image) => ({
      id: image.id,
      mime_type: image.mimeType,
      sort_order: image.sortOrder,
      url: `/api/products/${product.id}/images/${image.id}`,
    }));
  });
}

export async function loadProductImage(actor: Actor, productId: string, imageId: string) {
  const image = await withActor(actor, async (tx) => {
    const product = await tx.product.findFirst({
      where: productAccessWhere(actor, productId),
      select: { id: true },
    });
    if (!product) throw new AppError(404, "NOT_FOUND", "Produto não encontrado.");
    const row = await tx.productImage.findFirst({
      where: { id: imageId, productId: product.id },
    });
    if (!row) throw new AppError(404, "NOT_FOUND", "Imagem não encontrada.");
    return row;
  });
  const bytes = await readProductImage(image.storageKey);
  return { bytes, mimeType: image.mimeType };
}

export async function deleteProductImage(actor: Actor, productId: string, imageId: string) {
  const storageKey = await withActor(actor, async (tx) => {
    const product = await tx.product.findFirst({
      where: productAccessWhere(actor, productId),
      select: { id: true },
    });
    if (!product) throw new AppError(404, "NOT_FOUND", "Produto não encontrado.");
    const row = await tx.productImage.findFirst({
      where: { id: imageId, productId: product.id },
    });
    if (!row) throw new AppError(404, "NOT_FOUND", "Imagem não encontrada.");
    await tx.productImage.delete({ where: { id: row.id } });
    return row.storageKey;
  });
  await removeProductImage(storageKey);
  audit("image_deleted", { userId: actor.id, productId, imageId });
  return { id: imageId };
}
