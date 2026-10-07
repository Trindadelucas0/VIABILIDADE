import { assertSameOrigin, handle, json, readJson } from "../../../server/http";
import { requireActor } from "../../../server/auth/session";
import { withActor } from "../../../server/db";
import { audit } from "../../../server/errors";
import { AppError } from "../../../server/errors";
import {
  assertAdmin,
  currentParameters,
  parseParameterPatch,
  serializeParameters,
} from "../../../server/parameters/service";
import { parametersSchema } from "../../../server/schemas";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handle(async () => {
    const actor = await requireActor(request);
    assertAdmin(actor.role);
    const row = await withActor(actor, (tx) => currentParameters(tx));
    if (!row) throw new AppError(404, "NOT_FOUND", "Parâmetros ainda não foram criados.");
    return json(serializeParameters(row));
  });
}

export async function PATCH(request: Request) {
  return handle(async () => {
    assertSameOrigin(request);
    const actor = await requireActor(request);
    assertAdmin(actor.role);
    const input = parametersSchema.parse(await readJson(request));
    const data = parseParameterPatch(input);
    const row = await withActor(actor, async (tx) => {
      const current = await currentParameters(tx);
      if (!current) throw new AppError(404, "NOT_FOUND", "Parâmetros ainda não foram criados.");
      return tx.financialParameter.update({
        where: { id: current.id },
        data: { ...data, version: { increment: 1 } },
      });
    });
    audit("parameters_updated", { userId: actor.id, version: row.version });
    return json(serializeParameters(row));
  });
}
