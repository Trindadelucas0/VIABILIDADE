import { assertSameOrigin, handle, json, readJson } from "../../../../server/http";
import { requireActor } from "../../../../server/auth/session";
import { deleteProduct, getProduct, updateProduct } from "../../../../server/products/service";
import { productWriteSchema } from "../../../../server/schemas";
import { assertUuid } from "../../../../server/uuid";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const actor = await requireActor(request);
    const { id } = await context.params;
    assertUuid(id, "Produto não encontrado.");
    return json(await getProduct(actor, id));
  });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    assertSameOrigin(request);
    const actor = await requireActor(request);
    const { id } = await context.params;
    assertUuid(id, "Produto não encontrado.");
    const input = productWriteSchema.parse(await readJson(request));
    return json(await updateProduct(actor, id, input));
  });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    assertSameOrigin(request);
    const actor = await requireActor(request);
    const { id } = await context.params;
    assertUuid(id, "Produto não encontrado.");
    return json(await deleteProduct(actor, id));
  });
}
