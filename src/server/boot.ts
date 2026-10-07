import { parseAdminFromEnv, parseSeedUsers, seedUsers } from "./auth/seed-users";
import { prisma } from "./db";
import { resolveDatabaseUrl } from "./database-url";
import { audit } from "./errors";

export function assertRuntimeEnv() {
  resolveDatabaseUrl();
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
    throw new Error("SESSION_SECRET ausente ou curto demais (mínimo 32 caracteres).");
  }
  parseAdminFromEnv();
  const seedRaw = process.env.SEED_USERS;
  if (seedRaw && seedRaw.trim() !== "") {
    parseSeedUsers(seedRaw);
  }
}

function databaseFailure(error: unknown): never {
  const raw = error instanceof Error ? error.message : "Falha ao iniciar.";
  const safe = /postgres(?:ql)?:\/\/\S+/gi.test(raw)
    ? "Não foi possível conectar ao banco. Confira DATABASE_URL e se o Postgres está no ar."
    : raw;
  throw new Error(safe);
}

export async function boot() {
  assertRuntimeEnv();
  let users = 0;
  try {
    users = await seedUsers(prisma);
  } catch (error) {
    databaseFailure(error);
  }
  try {
    await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.user_id', 'seed', true)`;
    await tx.$executeRaw`SELECT set_config('app.role', 'ADMIN', true)`;
    const existing = await tx.financialParameter.findFirst({ select: { id: true } });
    if (!existing) {
      await tx.financialParameter.create({
        data: {
          version: 1,
          salesTaxRate: "0.080000",
          operationalCostRate: "0.050000",
        },
      });
    }
  });
  } catch (error) {
    databaseFailure(error);
  }
  audit("boot", { users });
}
