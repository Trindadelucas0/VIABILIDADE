import { handle, json } from "../../../../server/http";
import { publicUser } from "../../../../server/auth/actor";
import { requireActor } from "../../../../server/auth/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handle(async () => {
    const actor = await requireActor(request);
    return json(publicUser(actor));
  });
}
