import bcrypt from "bcrypt";
import { Prisma } from "@prisma/client";
import { assertAdmin } from "../../../server/parameters/service";
import { requireActor } from "../../../server/auth/session";
import { prisma } from "../../../server/db";
import { AppError, audit } from "../../../server/errors";
import { assertSameOrigin, handle, json, readJson } from "../../../server/http";
import { createUserSchema } from "../../../server/schemas";

export const dynamic = "force-dynamic";

const ROUNDS = 12;

function serializeUser(row: { id: string; email: string; role: string; createdAt: Date }) {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    created_at: row.createdAt.toISOString(),
  };
}

export async function GET(request: Request) {
  return handle(async () => {
    const actor = await requireActor(request);
    assertAdmin(actor.role);
    const rows = await prisma.user.findMany({
      orderBy: { email: "asc" },
      select: { id: true, email: true, role: true, createdAt: true },
    });
    return json(rows.map(serializeUser));
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    assertSameOrigin(request);
    const actor = await requireActor(request);
    assertAdmin(actor.role);
    const input = createUserSchema.parse(await readJson(request));
    const email = input.email.toLowerCase();
    const passwordHash = await bcrypt.hash(input.password, ROUNDS);
    try {
      const row = await prisma.user.create({
        data: { email, passwordHash, role: input.role },
        select: { id: true, email: true, role: true, createdAt: true },
      });
      audit("user_created", { userId: actor.id, targetId: row.id });
      return json(serializeUser(row), 201);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new AppError(409, "CONFLICT", "Este e-mail já está cadastrado.");
      }
      throw error;
    }
  });
}
