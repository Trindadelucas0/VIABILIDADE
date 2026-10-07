type EnvLike = Record<string, string | undefined>;

function trim(value: string | undefined): string | undefined {
  const v = value?.trim();
  return v ? v : undefined;
}

export function buildDatabaseUrlFromParts(env: EnvLike): string | undefined {
  const host = trim(env.DB_HOST);
  const port = trim(env.DB_PORT);
  const name = trim(env.DB_NAME);
  const user = trim(env.DB_USER);
  const password = env.DB_PASSWORD;

  if (!host || !port || !name || !user || password === undefined || password === "") {
    return undefined;
  }

  const userEnc = encodeURIComponent(user);
  const passEnc = encodeURIComponent(password);
  return `postgresql://${userEnc}:${passEnc}@${host}:${port}/${name}`;
}

export function resolveDatabaseUrl(env: EnvLike = process.env): string {
  const fromParts = buildDatabaseUrlFromParts(env);
  const direct = trim(env.DATABASE_URL);
  const url = fromParts ?? direct;
  if (!url) {
    throw new Error(
      "DATABASE_URL ausente. Preencha DB_HOST, DB_PORT, DB_NAME, DB_USER e DB_PASSWORD ou DATABASE_URL.",
    );
  }
  return url;
}
