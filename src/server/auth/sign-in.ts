import { prisma } from "../db";
import { AppError, audit } from "../errors";
import { assertUnderLimit, recordLimitHit } from "../rate-limit";
import { loginSchema } from "../schemas";
import { publicUser } from "./actor";
import { verifyPassword } from "./password";
import { openSession } from "./session";

export async function signInWithPassword(email: string, password: string, ip: string) {
  assertUnderLimit(`login:${ip}`);
  const parsed = loginSchema.safeParse({ email, password });
  if (!parsed.success) {
    throw new AppError(401, "INVALID_CREDENTIALS", "E-mail ou senha inválidos.");
  }
  const normalizedEmail = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, email: true, role: true, passwordHash: true },
  });
  const ok = await verifyPassword(parsed.data.password, user?.passwordHash ?? null);
  if (!ok || !user) {
    recordLimitHit(`login:${ip}`);
    audit("login_failed", { ip });
    throw new AppError(401, "INVALID_CREDENTIALS", "E-mail ou senha inválidos.");
  }
  const token = await openSession(user.id);
  audit("login", { userId: user.id });
  return { token, user: publicUser(user) };
}
