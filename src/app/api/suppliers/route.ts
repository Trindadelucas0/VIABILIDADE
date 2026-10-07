import { assertSameOrigin, handle, json, readJson } from "../../../server/http";
import { requireActor } from "../../../server/auth/session";
import { createSupplier, listSuppliers } from "../../../server/suppliers/service";
import { supplierWriteSchema } from "../../../server/schemas";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handle(async () => {
    const actor = await requireActor(request);
    return json(await listSuppliers(actor));
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    assertSameOrigin(request);
    const actor = await requireActor(request);
    const input = supplierWriteSchema.parse(await readJson(request));
    return json(await createSupplier(actor, input), 201);
  });
}
