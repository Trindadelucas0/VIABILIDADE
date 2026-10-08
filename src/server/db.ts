import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "@prisma/client";
import type { Actor } from "./auth/actor";
import { resolveDatabaseUrl } from "./database-url";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrisma() {
  const connectionString = resolveDatabaseUrl();
  // A transação prende uma conexão. O Prisma busca relações em paralelo;
  // o pg só aceita isso com pipeline, senão avisa e no pg 9 passa a falhar.
  const adapter = new PrismaPg({ connectionString, pipeline: true });
  return new PrismaClient({ adapter, log: ["error"] });
}

function getPrisma() {
  if (!globalForPrisma.prisma) globalForPrisma.prisma = createPrisma();
  return globalForPrisma.prisma;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    const client = getPrisma();
    const value = Reflect.get(client, property, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export type Tx = Prisma.TransactionClient;

export async function withActor<T>(actor: Actor, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.user_id', ${actor.id}, true)`;
    await tx.$executeRaw`SELECT set_config('app.role', ${actor.role}, true)`;
    return fn(tx);
  });
}
