import { assertSameOrigin, handle, json } from "../../../../server/http";
import { audit } from "../../../../server/errors";
import { clearSessionCookie, destroySession, readActor } from "../../../../server/auth/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handle(async () => {
    assertSameOrigin(request);
    const actor = await readActor(request);
    await destroySession(request);
    const response = json({ ok: true });
    clearSessionCookie(response);
    if (actor) audit("logout", { userId: actor.id });
    return response;
  });
}
