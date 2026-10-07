import { describe, expect, it } from "vitest";
import { buildDatabaseUrlFromParts, resolveDatabaseUrl } from "./database-url";

describe("buildDatabaseUrlFromParts", () => {
  it("monta URL com host, porta, banco, usuário e senha codificados", () => {
    expect(
      buildDatabaseUrlFromParts({
        DB_HOST: "localhost",
        DB_PORT: "5432",
        DB_NAME: "viabilidade",
        DB_USER: "postgres",
        DB_PASSWORD: "131201",
      }),
    ).toBe("postgresql://postgres:131201@localhost:5432/viabilidade");
  });

  it("codifica @ na senha", () => {
    expect(
      buildDatabaseUrlFromParts({
        DB_HOST: "localhost",
        DB_PORT: "5432",
        DB_NAME: "viabilidade",
        DB_USER: "user",
        DB_PASSWORD: "p@ss",
      }),
    ).toBe("postgresql://user:p%40ss@localhost:5432/viabilidade");
  });

  it("retorna undefined se faltar DB_NAME", () => {
    expect(
      buildDatabaseUrlFromParts({
        DB_HOST: "localhost",
        DB_PORT: "5432",
        DB_USER: "postgres",
        DB_PASSWORD: "x",
      }),
    ).toBeUndefined();
  });
});

describe("resolveDatabaseUrl", () => {
  it("prefere DB_* quando completos", () => {
    expect(
      resolveDatabaseUrl({
        DB_HOST: "localhost",
        DB_PORT: "5432",
        DB_NAME: "viabilidade",
        DB_USER: "postgres",
        DB_PASSWORD: "131201",
        DATABASE_URL: "postgresql://ignored",
      }),
    ).toBe("postgresql://postgres:131201@localhost:5432/viabilidade");
  });

  it("usa DATABASE_URL quando DB_* incompletos", () => {
    expect(
      resolveDatabaseUrl({
        DATABASE_URL: "postgresql://u:p@host:5432/db",
      }),
    ).toBe("postgresql://u:p@host:5432/db");
  });

  it("falha quando não há conexão", () => {
    expect(() => resolveDatabaseUrl({})).toThrow(/DATABASE_URL ausente/);
  });
});
