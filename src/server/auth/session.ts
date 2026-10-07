import { createHmac, randomBytes } from "crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { prisma } from "../db";
import { AppError } from "../errors";
import type { Actor } from "./actor";

export const SESSION_COOKIE = "viabilidade_session";
const TTL_SECONDS = 60 * 60 * 12;

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET ausente ou curto demais (mínimo 32 caracteres).");
  }
  return secret;
}

export function hashSessionToken(token: string): string {
  return createHmac("sha256", sessionSecret()).update(token).digest("hex");
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: TTL_SECONDS,
  };
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [rawKey, ...rest] = part.trim().split("=");
    if (rawKey === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export async function openSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + TTL_SECONDS * 1000);
  await prisma.session.deleteMany({ where: { userId, expiresAt: { lt: new Date() } } });
  await prisma.session.create({ data: { userId, tokenHash, expiresAt } });
  return token;
}

export function attachSession(response: NextResponse, token: string) {
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
}

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, sessionCookieOptions());
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
}

export async function readActor(request: Request): Promise<Actor | null> {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return null;
  const tokenHash = hashSessionToken(token);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: { select: { id: true, email: true, role: true } } },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  return { id: session.user.id, email: session.user.email, role: session.user.role };
}

export async function requireActor(request: Request): Promise<Actor> {
  const actor = await readActor(request);
  if (!actor) {
    throw new AppError(401, "UNAUTHENTICATED", "Sessão expirada. Entre novamente.");
  }
  return actor;
}

export async function destroySession(request: Request): Promise<void> {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return;
  const tokenHash = hashSessionToken(token);
  await prisma.session.deleteMany({ where: { tokenHash } });
}
