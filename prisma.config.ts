import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "prisma/config";

function loadDotEnv() {
  const path = resolve(process.cwd(), ".env");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (process.env[key] !== undefined) continue;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadDotEnv();

function prismaDatabaseUrl(): string {
  const host = process.env.DB_HOST?.trim();
  const port = process.env.DB_PORT?.trim();
  const name = process.env.DB_NAME?.trim();
  const user = process.env.DB_USER?.trim();
  const password = process.env.DB_PASSWORD;

  if (host && port && name && user && password !== undefined && password !== "") {
    return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${name}`;
  }

  const direct = process.env.DATABASE_URL?.trim();
  if (!direct) {
    throw new Error(
      "DATABASE_URL ausente. Preencha DB_HOST, DB_PORT, DB_NAME, DB_USER e DB_PASSWORD ou DATABASE_URL.",
    );
  }
  return direct;
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: prismaDatabaseUrl(),
  },
});
