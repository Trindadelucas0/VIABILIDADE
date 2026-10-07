import { assertSameOrigin, handle, json, readJson } from "../../../../server/http";
import { requireActor } from "../../../../server/auth/session";
import { updateSupplier } from "../../../../server/suppliers/service";
import { supplierPatchSchema } from "../../../../server/schemas";
import { assertUuid } from "../../../../server/uuid";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    assertSameOrigin(request);
    const actor = await requireActor(request);
    const { id } = await context.params;
    assertUuid(id, "Fornecedor não encontrado.");
    const input = supplierPatchSchema.parse(await readJson(request));
    return json(await updateSupplier(actor, id, input));
  });
}
