import { assertSameOrigin, handle, json } from "../../../../../server/http";
import { requireActor } from "../../../../../server/auth/session";
import { createAnalysis } from "../../../../../server/analysis/create-analysis";
import { getProduct } from "../../../../../server/products/service";
import { assertUuid } from "../../../../../server/uuid";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const actor = await requireActor(request);
    const { id } = await context.params;
    assertUuid(id, "Produto não encontrado.");
    const product = await getProduct(actor, id);
    return json(product.analyses);
  });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    assertSameOrigin(request);
    const actor = await requireActor(request);
    const { id } = await context.params;
    assertUuid(id, "Produto não encontrado.");
    return json(await createAnalysis(actor, id), 201);
  });
}
