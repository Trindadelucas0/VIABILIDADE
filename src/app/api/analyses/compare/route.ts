import { assertSameOrigin, handle, json, readJson } from "../../../../server/http";
import { requireActor } from "../../../../server/auth/session";
import { compareProducts } from "../../../../server/analysis/compare";
import { idListSchema } from "../../../../server/schemas";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handle(async () => {
    assertSameOrigin(request);
    const actor = await requireActor(request);
    const input = idListSchema.parse(await readJson(request));
    return json(await compareProducts(actor, input.ids));
  });
}
