import { signInWithPassword } from "../../../../server/auth/sign-in";
import { attachSession } from "../../../../server/auth/session";
import { assertSameOrigin, clientIp, handle, json, readJson } from "../../../../server/http";
import { loginSchema } from "../../../../server/schemas";
import { AppError } from "../../../../server/errors";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handle(async () => {
    assertSameOrigin(request);
    const ip = clientIp(request);
    const parsed = loginSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      throw new AppError(401, "INVALID_CREDENTIALS", "E-mail ou senha inválidos.");
    }
    const { token, user } = await signInWithPassword(parsed.data.email, parsed.data.password, ip);
    const response = json(user);
    attachSession(response, token);
    return response;
  });
}
