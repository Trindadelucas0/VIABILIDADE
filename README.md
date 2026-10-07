# Viabilidade

Coleta e análise de produtos na feira. A fonte de comportamento é [docs/DOCUMENTACAO-SISTEMA.md](docs/DOCUMENTACAO-SISTEMA.md).

## Subir

1. Copie `.env.example` para `.env`.
2. Preencha `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `SESSION_SECRET` (mínimo 32 caracteres) e `SEED_USERS` no formato `email|ADMIN|senha;email|OPERATOR|senha`. A aplicação monta a URL do Postgres a partir dos campos `DB_*`; você pode omitir `DATABASE_URL` se os cinco estiverem preenchidos. Sem `SEED_USERS` o servidor não sobe. Não commite o `.env`.
3. Em produção, a conexão não deve ser superuser: o RLS do banco não vale para superuser. No desenvolvimento local com `postgres`, o isolamento entre operadores fica na aplicação (`scope.ts`).
4. Rode:

```bash
npm install
node --env-file=.env scripts/ensure-database.mjs
npx prisma migrate deploy
npm run dev
```

Logins locais de exemplo (se usar o `.env` gerado pelo projeto): `admin@viabilidade.local` / `feira-admin-local` e `operador@viabilidade.local` / `feira-operador-local`.

O seed de usuários e da linha de parâmetros roda na subida do servidor e também com `npm run db:seed`. O log não imprime senha.

Teste do cálculo, sem banco: `npm test`.
