import pg from "pg";

const host = process.env.DB_HOST?.trim() ?? "localhost";
const port = Number(process.env.DB_PORT?.trim() ?? "5432");
const name = process.env.DB_NAME?.trim() ?? "viabilidade";
const user = process.env.DB_USER?.trim() ?? "postgres";
const password = process.env.DB_PASSWORD ?? "";

if (!password) {
  console.error("DB_PASSWORD ausente. Configure o .env.");
  process.exit(1);
}

const admin = new pg.Client({
  host,
  port,
  user,
  password,
  database: "postgres",
});

try {
  await admin.connect();
  const exists = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [name]);
  if (exists.rowCount === 0) {
    if (!/^[a-zA-Z0-9_]+$/.test(name)) {
      throw new Error("DB_NAME inválido.");
    }
    await admin.query(`CREATE DATABASE ${name}`);
    console.log(`Banco ${name} criado.`);
  } else {
    console.log(`Banco ${name} já existe.`);
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error("Não foi possível garantir o banco:", message);
  process.exit(1);
} finally {
  await admin.end();
}
