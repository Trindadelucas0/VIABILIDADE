import bcrypt from "bcrypt";
import { assertAdmin } from "../../../../server/parameters/service";
import { requireActor } from "../../../../server/auth/session";
import { prisma } from "../../../../server/db";
import { AppError, audit } from "../../../../server/errors";
import { assertSameOrigin, handle, json, readJson } from "../../../../server/http";
import { updateUserSchema } from "../../../../server/schemas";

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

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    assertSameOrigin(request);
    const actor = await requireActor(request);
    assertAdmin(actor.role);
    const { id } = await context.params;
    const input = updateUserSchema.parse(await readJson(request));

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true, createdAt: true },
    });
    if (!target) {
      throw new AppError(404, "NOT_FOUND", "Usuário não encontrado.");
    }

    if (input.role === "OPERATOR" && target.role === "ADMIN") {
      const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
      if (adminCount <= 1) {
        throw new AppError(
          422,
          "VALIDATION",
          target.id === actor.id
            ? "Você não pode rebaixar a si mesmo sendo o único administrador."
            : "Não é possível remover o último administrador.",
        );
      }
    }

    const data: { role?: "ADMIN" | "OPERATOR"; passwordHash?: string } = {};
    if (input.role !== undefined) data.role = input.role;
    if (input.password !== undefined) {
      data.passwordHash = await bcrypt.hash(input.password, ROUNDS);
    }

    const row = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, email: true, role: true, createdAt: true },
    });
    audit("user_updated", { userId: actor.id, targetId: row.id });
    return json(serializeUser(row));
  });
}
