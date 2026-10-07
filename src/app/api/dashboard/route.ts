import { handle, json } from "../../../server/http";
import { requireActor } from "../../../server/auth/session";
import { resolveVisibility } from "../../../server/auth/scope";
import { loadDashboard } from "../../../server/dashboard/service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handle(async () => {
    const actor = await requireActor(request);
    const url = new URL(request.url);
    const visibility = resolveVisibility(actor, url.searchParams.get("scope"));
    return json(await loadDashboard(actor, visibility));
  });
}
