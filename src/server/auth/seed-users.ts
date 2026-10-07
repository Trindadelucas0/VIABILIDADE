import bcrypt from "bcrypt";
import type { PrismaClient } from "@prisma/client";
import type { Role } from "./actor";

const ROUNDS = 12;

export type SeedUser = {
  email: string;
  role: Role;
  password: string;
};

export function parseAdminFromEnv(): SeedUser {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? "";
  const password = process.env.ADMIN_PASSWORD ?? "";
  if (!email.includes("@") || email.length > 254) {
    throw new Error("ADMIN_EMAIL ausente ou inválido.");
  }
  if (password.length < 8) {
    throw new Error("ADMIN_PASSWORD ausente ou curta demais (mínimo 8 caracteres).");
  }
  return { email, role: "ADMIN", password };
}

export function parseSeedUsers(raw: string | undefined): SeedUser[] {
  if (!raw || raw.trim() === "") {
    return [];
  }

  const parts = raw
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  if (parts.length === 0) {
    return [];
  }

  const seen = new Set<string>();
  return parts.map((part) => {
    const pieces = part.split("|");
    if (pieces.length < 3) {
      throw new Error("SEED_USERS inválido. Use email|ADMIN|senha;email|OPERATOR|senha.");
    }
    const email = pieces[0]?.trim().toLowerCase() ?? "";
    const role = pieces[1]?.trim() ?? "";
    const password = pieces.slice(2).join("|");
    if (!email.includes("@") || email.length > 254) {
      throw new Error("SEED_USERS contém um e-mail inválido.");
    }
    if (role !== "ADMIN" && role !== "OPERATOR") {
      throw new Error("SEED_USERS contém um papel inválido. Use ADMIN ou OPERATOR.");
    }
    if (password.length < 8) {
      throw new Error("SEED_USERS exige senha com pelo menos 8 caracteres.");
    }
    if (seen.has(email)) {
      throw new Error("SEED_USERS contém e-mail repetido.");
    }
    seen.add(email);
    return { email, role, password };
  });
}

async function upsertUser(db: PrismaClient, user: SeedUser) {
  const passwordHash = await bcrypt.hash(user.password, ROUNDS);
  await db.user.upsert({
    where: { email: user.email },
    update: { passwordHash, role: user.role },
    create: { email: user.email, passwordHash, role: user.role },
  });
}

export async function seedUsers(db: PrismaClient): Promise<number> {
  const admin = parseAdminFromEnv();
  const byEmail = new Map<string, SeedUser>();
  byEmail.set(admin.email, admin);

  for (const user of parseSeedUsers(process.env.SEED_USERS)) {
    byEmail.set(user.email, user);
  }

  for (const user of byEmail.values()) {
    await upsertUser(db, user);
  }

  return byEmail.size;
}
