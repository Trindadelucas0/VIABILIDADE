# Viabilidade — Documentação do Sistema

| Item | Valor |
|------|--------|
| Versão do sistema | 1.0.0 — Viabilidade |
| Última atualização | 07/10/2026 (preço na digitação mostra R$ ou US$ e 270 vira 270,00) |
| Fonte oficial | Este arquivo |
| Anexos | [prd-flow](prd-flow), [trd](trd), [implementacao](implementacao) |

Os anexos descrevem a intenção original. Se divergirem deste arquivo, vale o que está implementado aqui.

## 1. Como usar este documento

Este é o mapa de tela, campo, regra e código. Para um bug: anote a rota, a ação, o esperado e o obtido, e siga a coluna "Onde olhar no código" antes de mudar regra.

Não há cadastro público nem tela de convite. O administrador inicial vem de `ADMIN_EMAIL` e `ADMIN_PASSWORD` no boot; operadores extras podem vir de `SEED_USERS` (opcional) ou ser cadastrados em **Usuários** (`/usuarios`).

## 2. Tecnologias utilizadas

| Camada | Tecnologia | Função |
|--------|------------|--------|
| Web | Next.js 15 App Router, React, TypeScript, Tailwind | Telas em `src/app`. A UI só chama `/api`. |
| API | Route handlers em `src/app/api` | Contrato HTTP. Validação Zod, sessão, escopo. |
| Domínio | `src/domain` | Margem, classificação, `canAnalyze`, status. Não importa React nem `next/server`. |
| Banco | PostgreSQL, Prisma 7, adapter `pg` | Dinheiro em `DECIMAL`. RLS nas tabelas de negócio. |
| Arquivos | Disco `storage/products/` | Fotos fora de `public/`. |
| PWA | Serwist | Precache do shell. `/api` sem cache. |

### 2.1 Histórico de versões

| Versão | Nome | O que entrou |
|--------|------|----------------|
| 1.0.0 | Viabilidade | Login por seed, catálogo com escopo, análise com snapshot, lote, comparação, dashboard, parâmetros, PWA online-first. Correção: o id na URL do produto, da foto e do fornecedor aceita UUID v4 (o quarto grupo tem 4 caracteres). Preço na feira e preço Brasil formatam na digitação (US$ / R$, 270 = 270,00). |

`package.json` está em `1.0.0`.

## 3. Mapa de telas

| Origem | Ação | Destino |
|--------|------|---------|
| `/login` | Entrar | `/` |
| `/` | Cadastrar produto | `/produtos/novo` |
| `/` | Card ou atalho de filtro | `/produtos` ou `/produtos/[id]` |
| `/produtos` | Toque no card | `/produtos/[id]` |
| `/produtos` | Analisar selecionados | `/comparar?ids=` |
| `/produtos/novo` | Salvar (wizard) | Permanece em `/produtos/novo` (passo Foto do próximo produto) |
| `/produtos/novo` | Abrir prontuário (link após salvar) | `/produtos/[id]` |
| `/produtos/[id]` | Analisar | `/produtos/[id]/resultado` |
| `/produtos/[id]/resultado` | Ver composição | `/produtos/[id]/composicao` |
| `/produtos/[id]/resultado` | Alterar parâmetros (admin) | `/parametros` |
| `/comparar` | Toque na linha com análise | `/produtos/[id]/resultado` |

Mobile (até 959px): barra inferior Início, Produtos, Novo, Comparar. Desktop: a mesma navegação vira coluna lateral. **Usuários** e **Parâmetros** só aparecem para admin.

## 4. Papéis e acesso

| Papel | Pode | Não pode |
|-------|------|----------|
| OPERATOR | Cadastrar, fotografar, analisar, comparar e arquivar o que criou. Ver e editar os próprios fornecedores. | Ver produto, imagem, análise ou fornecedor de outro operador. Alterar parâmetros. Excluir produto. |
| ADMIN | Tudo do operador, no catálogo inteiro. Filtro Todos (padrão) ou Meus. Alterar parâmetros. Excluir produto e as fotos no disco. | — |

Operador em `GET` ou `PATCH /api/financial-parameters` recebe 403. Produto de outro operador responde 404, não 403. Sem cookie, a API responde 401.

Não há empresa nem feira como entidade. O isolamento é `created_by` do usuário. Há uma linha global de parâmetros.

## 5. Índice de rotas e onde olhar no código

| Rota | Código |
|------|--------|
| `/login` | `src/app/login/page.tsx` |
| `/` | `src/app/(app)/page.tsx` |
| `/produtos` | `src/app/(app)/produtos/page.tsx` |
| `/produtos/novo` | `src/app/(app)/produtos/novo/page.tsx` |
| `/produtos/[id]` | `src/app/(app)/produtos/[id]/page.tsx` |
| `/produtos/[id]/resultado` | `src/app/(app)/produtos/[id]/resultado/page.tsx` |
| `/produtos/[id]/composicao` | `src/app/(app)/produtos/[id]/composicao/page.tsx` |
| `/comparar` | `src/app/(app)/comparar/page.tsx` |
| `/parametros` | `src/app/(app)/parametros/page.tsx` |
| `/usuarios` | `src/app/(app)/usuarios/page.tsx` |
| `/offline` | `src/app/offline/page.tsx` |
| `POST /api/auth/login` | `src/app/api/auth/login/route.ts`, `src/server/auth/sign-in.ts` |
| `GET/POST /api/users` | `src/app/api/users/route.ts` |
| `PATCH /api/users/:id` | `src/app/api/users/[id]/route.ts` |
| `POST /api/auth/logout` | `src/app/api/auth/logout/route.ts` |
| `GET /api/auth/me` | `src/app/api/auth/me/route.ts` |
| `GET/POST /api/products` | `src/app/api/products/route.ts` |
| `GET/PATCH/DELETE /api/products/:id` | `src/app/api/products/[id]/route.ts` |
| `GET/POST /api/products/:id/images` | `src/app/api/products/[id]/images/route.ts` |
| `GET/DELETE /api/products/:id/images/:imageId` | `src/app/api/products/[id]/images/[imageId]/route.ts` |
| `GET/POST /api/products/:id/analysis` | `src/app/api/products/[id]/analysis/route.ts` |
| `POST /api/products/:id/reanalysis` | `src/app/api/products/[id]/reanalysis/route.ts` |
| `POST /api/analyses/batch` | `src/app/api/analyses/batch/route.ts` |
| `POST /api/analyses/compare` | `src/app/api/analyses/compare/route.ts` |
| `GET/POST /api/suppliers` | `src/app/api/suppliers/route.ts` |
| `PATCH /api/suppliers/:id` | `src/app/api/suppliers/[id]/route.ts` |
| `GET/PATCH /api/financial-parameters` | `src/app/api/financial-parameters/route.ts` |
| `GET /api/dashboard` | `src/app/api/dashboard/route.ts` |
| Cálculo | `src/domain/analysis-service.ts` |
| Completude | `src/domain/can-analyze.ts` |
| Classificação | `src/domain/classification.ts` |
| Escopo | `src/server/auth/scope.ts` |
| Sessão | `src/server/auth/session.ts` |
| Seed e login | `src/server/auth/seed-users.ts`, `src/server/auth/sign-in.ts`, `src/server/boot.ts`, `src/app/login/actions.ts` |
| Imagem | `src/server/images/validate-image.ts`, `src/server/images/storage.ts` |

Erro da API:

```json
{ "error": { "code": "CODIGO", "message": "texto em português", "fields": {}, "missing": [] } }
```

| HTTP | Código | Quando |
|------|--------|--------|
| 401 | `INVALID_CREDENTIALS` | E-mail desconhecido ou senha errada. A mensagem é sempre "E-mail ou senha inválidos." |
| 401 | `UNAUTHENTICATED` | Sem sessão ou sessão expirada. |
| 403 | `FORBIDDEN` | Operador em parâmetros ou usuários, operador em exclusão, ou origem diferente. |
| 409 | `CONFLICT` | E-mail de usuário já cadastrado. |
| 404 | `NOT_FOUND` | Id inexistente ou fora do escopo. |
| 422 | `VALIDATION` | Campo inválido ou análise impossível. `missing` lista o que falta. |
| 413 | `IMAGE_TOO_LARGE` | Arquivo acima de 8 MB. |
| 415 | `IMAGE_TYPE` | Bytes que não são JPEG, PNG ou WEBP. |
| 429 | `RATE_LIMITED` | Mais de 10 falhas de login em 15 minutos no mesmo IP. |

Sucesso devolve o recurso. `POST` de análise responde 201 com margem, classificação, composição e `parameter_version`.

## 6. Telas e fluxos

### 6.1 Login

| Campo | O que é | Obrigatório | Onde olhar |
|-------|---------|-------------|------------|
| E-mail | Conta cadastrada | Sim | `src/app/login/login-form.tsx` |
| Senha | Conferida com bcrypt no servidor | Sim | `src/server/auth/password.ts` |
| Entrar | Server Action `loginAction` (`POST` nativo do formulário). Sucesso define cookie e redireciona para `/`. | — | `src/app/login/actions.ts`, `src/server/auth/sign-in.ts` |

A API `POST /api/auth/login` permanece para integrações; usa o mesmo `signInWithPassword`. O middleware remove `email` ou `password` da query em `/login` para não vazar senha na URL.

Estados: botão bloqueado enquanto envia; credenciais inválidas mostram a frase sob o botão.

### 6.1.1 Usuários (admin)

Só **ADMIN**. Lista contas, cria operador ou outro admin (e-mail, senha inicial ≥ 8 caracteres, papel). Editar permite nova senha e/ou papel. Não há exclusão no MVP. E-mail duplicado responde 409. Não é permitido rebaixar o último administrador.

Código: `src/app/(app)/usuarios/page.tsx`, `src/app/api/users/route.ts`, `src/app/api/users/[id]/route.ts`.

### 6.2 Início

Ordem na tela: **Principais oportunidades** (margem em destaque e classificação), depois contadores (Produtos, Pendentes, Analisados, Excelentes), busca com botão **Buscar** (Enter faz o mesmo) para `/produtos?q=`, chips de atalho para `/produtos` com `status` ou `classificacao`. Oportunidades são as cinco maiores margens da última análise. Admin vê Todos | Meus (padrão Todos). Sem produtos: "Nenhum produto ainda" e **Cadastrar produto**. Com produtos e sem análise: "Nenhum produto analisado ainda" e **Ver pendentes**. Erro de rede: "Sem conexão. Os dados precisam de internet." e Tentar de novo.

Código: `src/app/(app)/page.tsx`, `src/server/dashboard/service.ts`.

### 6.3 Novo produto

Wizard de seis passos na mesma rota (`/produtos/novo`): Foto, Nome, Preço USD, Stand, Segmento, Fornecedor. Próximo não grava. Só **Salvar** no último passo chama `POST /api/products` (sem análise). Preço Brasil não entra no wizard; informe no prontuário depois da feira.

| Passo | Campo | Obrigatório para gravar | Obrigatório para analisar (no prontuário) |
|-------|-------|-------------------------|-------------------------------------------|
| Foto | Foto | Não | Não |
| Nome | Nome | Não | Sim |
| Preço na feira | Preço USD | Não | Sim, maior que zero |
| Stand | Stand | Não | Não |
| Segmento | Segmento | Não | Não. Texto livre, sugestão dos segmentos daquele usuário |
| Fornecedor | Usar existente | Não | O fornecedor precisa ter nome |
| Fornecedor | Número, telefone, obs | Não | Não |
| Fornecedor | Nome | Não | Sim |
| Prontuário | Preço Brasil R$ | Não | Sim, maior que zero |

A lista de fornecedores existentes é a do operador. Admin vê todos. Moeda gravada: USD. O último fornecedor usado fica em `sessionStorage` (`viabilidade_last_supplier`) para o próximo cadastro.

No passo Preço, o campo mostra `US$` fixo na frente. Digitar 270 mostra `US$ 270` na hora e `US$ 270,00` ao sair. Centavos só depois da vírgula ou do ponto. O valor gravado continua número (`270.00`), não o texto com símbolo.

Depois de salvar, a tela volta ao passo Foto com os campos do produto limpos e o fornecedor mantido. Trilha dos seis passos indica o passo atual. Hints **Entra na análise.** em Nome, Preço na feira e Nome do fornecedor; **Opcional.** em Stand e Segmento. Se houver `viabilidade_last_supplier`, aparece "Mesmo fornecedor da última ficha." Cartão **Salvo** com link **Abrir prontuário**. Câmbio e alíquotas vêm de `/parametros`; quando o admin salva lá, o prontuário atualiza a lista **Falta** sem editar o produto de novo. **Analisar** só no prontuário.

Câmera recusada: a mensagem fica no bloco da foto e **Pular** segue habilitado.

### 6.4 Catálogo

Filtros na query: `q`, `status`, `classificacao`. Busca com botão **Buscar**. Admin também usa `scope=mine` ou o padrão todos. Arquivados ficam de fora até o filtro Arquivados. Toque no card abre o prontuário. O checkbox não abre o card. Com última análise, o card mostra a margem percentual à direita. Analisar selecionados chama `POST /api/analyses/batch` e abre `/comparar` com os ids.

Vazio de busca: "Nenhum produto com esse filtro" e Limpar. Vazio real: link para Novo.

### 6.5 Prontuário

Foto principal, bloco **Falta** quando aplicável, seções **Preços** (preço Brasil em destaque enquanto vazio), **Produto**, **Fornecedor**, **Galeria** e **Histórico** (margem em destaque por linha). Na seção Preços, a feira usa `US$` e o Brasil usa `R$` na frente do número. 270 aparece como 270,00 ao sair do campo; o ponto de milhar é do campo (`2.700`). Câmbio e percentuais em `/parametros` não usam essa máscara. Lista, resultado, composição e comparação já mostram R$ ou US$ via `formatBrl` / `formatUsd`. Barra fixa inferior: **Salvar** e **Analisar** (primário). **Arquivar** e **Excluir** (admin) ficam no histórico, com confirmação pelo nome. Analisar fica desabilitado enquanto `can_analyze` for falso. Sem foto: "Sem imagem" e Adicionar foto.

### 6.6 Resultado e composição

Mostram a análise gravada (a última, ou a escolhida em `?analise=`). Não recalculam. Reanalisar cria outra linha e permanece na rota. Alterar parâmetros: admin vai para `/parametros`; operador vê o controle desabilitado com "Só o admin altera os parâmetros".

O resultado inclui o bloco **De onde veio o custo**: preço na feira (USD), câmbio do snapshot (`1 USD = R$`) e valor convertido (FOB em R$, preço na feira × câmbio). Em seguida vêm preço Brasil, custo final, resultado bruto, impostos sobre venda, custo operacional e resultado líquido.

A composição usa o mesmo formato de câmbio (`1 USD = R$`) e detalha FOB convertido, impostos de importação, nacionalização, frete, custo final e os percentuais do snapshot.

### 6.7 Comparação

`POST /api/analyses/compare` lê a última análise. Sem análise: "Sem análise". Id fora do escopo: "Produto não encontrado", sem nome. No celular a tabela vira cards com margem em destaque, classificação, custo final, preço Brasil e resultado líquido. O nome do produto abre `/produtos/[id]` ou `/produtos/[id]/resultado`. O id da URL passa por `src/server/uuid.ts` antes da busca. Um UUID v4 válido que não existe, ou de outro operador, continua 404. "Tentar de novo" repete essa busca.

### 6.8 Parâmetros

Só admin. Campos: câmbio (R$ por 1 USD), imposto de importação %, nacionalização %, frete + outros %, imposto sobre venda % (seed 8), custo operacional % (seed 5). Com câmbio e as três alíquotas de custo preenchidos, a tela abre em leitura (valores e versão); o formulário só abre em **Editar** ou quando falta algum desses quatro (zero conta como preenchido). **Salvar** volta à leitura. Salvar incrementa `version`. Análises antigas não mudam. Zero é válido nas três alíquotas de custo. Câmbio precisa ser maior que zero. Operador que abre a URL vê que não pode alterar.

## 7. Regras de negócio

### 7.1 Status

`DRAFT`, `PENDING`, `READY_FOR_ANALYSIS`, `ANALYZED`, `ARCHIVED`. O status não é a classificação.

Derivação em `src/domain/product-status.ts`: arquivado permanece arquivado; se existe ao menos uma análise, `ANALYZED`; se `canAnalyze` e ainda não há análise, `READY_FOR_ANALYSIS`; senão `PENDING`. O fluxo principal não grava `DRAFT`. Só o dono ou o admin arquiva. Exclusão física é só admin e apaga as imagens no disco.

### 7.2 canAnalyze

Exige nome, preço da feira maior que zero, moeda USD, preço Brasil maior que zero, fornecedor com nome, câmbio maior que zero e as três alíquotas de custo presentes. Zero nessas alíquotas é válido. Ausência não é. A função devolve a lista do que falta, inclusive "Câmbio nos parâmetros". Preço Brasil 0 não gera análise.

### 7.3 Fórmula

Única implementação: `analyze` em `src/domain/analysis-service.ts`, com `decimal.js`.

```text
fob_brl = preco_usd * cambio
imposto = fob_brl * aliquota_importacao
nacionalizacao = fob_brl * aliquota_nacionalizacao
frete = fob_brl * aliquota_frete
custo_final = fob_brl + imposto + nacionalizacao + frete
resultado_bruto = preco_brasil - custo_final
imposto_venda = preco_brasil * aliquota_venda
custo_operacional = preco_brasil * aliquota_operacional
resultado_liquido = resultado_bruto - imposto_venda - custo_operacional
margem = resultado_liquido / preco_brasil
```

As alíquotas no banco são fração (8% gravado como 0,08). A tela de parâmetros fala em percentual.

Preço digitado: `parseMoney` em `src/server/money-input.ts` aceita `270`, `270,50`, `R$ 270,00`, `US$ 1.270,50` e o texto da API `270.0000` (270 reais, não 270 milhões). `270.000` sem vírgula é milhar (270 mil). A máscara da tela limita a centavos; um valor já gravado com 3ª ou 4ª casa só arredonda se o campo for editado e salvo de novo.

Prova: câmbio 5, USD 10, alíquotas de custo 10%, Brasil 100, venda 8%, operacional 5% produzem margem 0,22 e classificação BOM.

### 7.4 Classificação

| Margem | Classificação |
|--------|----------------|
| Até 10% | RUIM |
| Acima de 10% e abaixo de 15% | FRACO |
| De 15% até abaixo de 20% | MÉDIO (`MEDIO` no banco) |
| De 20% até abaixo de 25% | BOM |
| 25% ou mais | EXCELENTE |

Margem negativa é RUIM. Fronteiras: 10% RUIM, 15% MÉDIO, 20% BOM, 25% EXCELENTE.

### 7.5 Snapshot

Cada análise grava uma linha em `analysis_parameter_snapshots` e o número `parameter_version`. O admin altera a linha única de `financial_parameters` e a versão sobe. A análise antiga continua com os percentuais da época. Reanálise cria outra linha; não apaga a anterior.

O lote analisa quem passa em `canAnalyze`. O resto volta em `skipped` com o motivo. Id fora do escopo entra como "não encontrado" e o restante segue.

A comparação não chama `analyze`.

O câmbio inicial é nulo. Não há cotação inventada. Enquanto o admin não preencher câmbio e as três alíquotas, a análise fica bloqueada.

### 7.6 Imagens

Disco em `storage/products/`, nome uuid, no máximo 8 MB e 10 imagens por produto. Magic bytes JPEG, PNG ou WEBP. `GET` da imagem exige sessão e escopo antes de ler o arquivo. Sem cookie: 401. O arquivo não fica em `public/`.

## 8. Como usar o sistema

1. Coloque no `.env` dois usuários, por exemplo um `ADMIN` e um `OPERATOR`, no formato de `.env.example`. As senhas ficam só nesse arquivo. O banco guarda o hash.
2. Suba o Postgres, rode `npx prisma migrate deploy` e `npm run dev`.
3. Abra `/login` e entre com o e-mail do operador.
4. Peça ao admin para abrir `/parametros` e salvar câmbio e alíquotas. Sem isso, o produto grava como pendente com "Câmbio nos parâmetros".
5. Em Novo, percorra o wizard (foto opcional, nome, preço USD, stand, segmento, fornecedor) e toque **Salvar**. No preço, digite 270 e confira `US$ 270,00` ao sair do campo. O fluxo reabre a foto do próximo produto com o mesmo fornecedor.
6. Depois da feira, abra o prontuário, informe o preço no Brasil e toque **Analisar** quando **Falta** estiver vazio (inclui parâmetros em `/parametros`).
7. No catálogo, marque produtos e use Analisar selecionados para ir à comparação.
8. O admin, em Início, usa Todos para ver a equipe e Meus para ver só o próprio cadastro. O operador não vê esse filtro.
9. Para o 404: com a sessão do operador, peça `GET /api/products/{id-do-admin-ou-de-outro}`. A resposta é 404. A foto desse id, sem cookie, é 401.

Notificação local: o navegador só é consultado depois do primeiro produto salvo, não no primeiro paint. O toast aparece mesmo se a permissão for negada. Não há servidor de Web Push.

## 9. Checklist de validação

- [ ] Dois logins: operador vê só o próprio cadastro; admin vê os dois.
- [ ] GET do produto do outro operador retorna 404.
- [ ] Salvar no wizard sem preço Brasil grava PENDING; o prontuário lista a pendência.
- [ ] Salvar no wizard volta ao passo Foto com o fornecedor preenchido; link Abrir prontuário funciona.
- [ ] Analisar no prontuário, com dados e parâmetros completos, abre `/produtos/[id]/resultado`.
- [ ] Reanalisar cria outra linha; a primeira margem continua no histórico.
- [ ] PATCH de parâmetros pelo operador retorna 403; análise antiga guarda a versão anterior.
- [ ] Foto sem cookie retorna 401; arquivo não está em `public/`.
- [ ] Offline: o shell pode abrir; a lista mostra "Sem conexão" e não grava cadastro local.
- [ ] No passo Preço e no prontuário, digitar 270 mostra US$ ou R$ na frente e 270,00 ao sair. Letras não entram. `/parametros` continua sem máscara de moeda.
- [ ] `npm test`: margem 22% BOM; 10% RUIM; 15% MÉDIO; 20% BOM; 25% EXCELENTE; preço Brasil 0 não analisa; 270,00 e `270.0000` leem como 270.

O teste unitário não usa Postgres. A API contra o banco não foi executada nesta entrega se o Postgres local não estava disponível.

## 10. Segurança

O que existe:

- Senha só como hash bcrypt. O seed não imprime a senha. Segredos só em `DATABASE_URL`, `SESSION_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` e, se usado, `SEED_USERS`. Nenhum `NEXT_PUBLIC_` com segredo.
- Cookie `viabilidade_session`: httpOnly, Secure em produção, SameSite=Lax. O token no cookie é opaco; o banco guarda HMAC-SHA256 com `SESSION_SECRET`. Expira em 12 horas. Logout apaga a linha.
- Toda leitura de produto, fornecedor, imagem e análise passa por `scope.ts`. Além disso, a migration `20261007143100_rls` liga RLS com `FORCE` nas tabelas de negócio. A transação define `app.user_id` e `app.role`. Superuser ignora RLS, então a conexão de runtime não deve ser superuser. `users` e `sessions` não têm RLS, porque o login ainda não tem papel.
- Zod em toda entrada. Campos gravados são explícitos. SQL de filtro da última classificação usa query parametrizada e a classificação só entra se estiver na lista fechada.
- Upload: tamanho, magic bytes, nome uuid, caminho preso a `storage/products/`.
- Login: mesma mensagem para e-mail e senha, hash dummy quando o e-mail não existe, limite de 10 falhas por IP a cada 15 minutos.
- Mutação exige `Origin` igual ao `Host` quando o header vem. Headers: `nosniff`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`, CSP e HSTS em produção. No CSP, `script-src` em desenvolvimento inclui `'unsafe-eval'` porque o webpack do `next dev` usa `eval-source-map`; em produção o `script-src` fica só com `'self'` e `'unsafe-inline'`.
- Erro inesperado não devolve stack. Log de auditoria não inclui senha.

Não implementado: convite, cadastro público, Web Push, fila offline, várias empresas, cotação automática.

## 11. Deploy / ambiente

| Variável | Uso |
|----------|-----|
| `DB_HOST` | Host do Postgres (ex.: `localhost`). |
| `DB_PORT` | Porta (ex.: `5432`). |
| `DB_NAME` | Nome do banco (ex.: `viabilidade`). |
| `DB_USER` | Usuário da conexão. |
| `DB_PASSWORD` | Senha da conexão. Só no `.env`, nunca no repositório. |
| `DATABASE_URL` | Opcional se `DB_*` estiver completo. Montada em `src/server/database-url.ts` e no `prisma.config.ts`. |
| `SESSION_SECRET` | Pelo menos 32 caracteres. Pepper do cookie. |
| `ADMIN_EMAIL` | E-mail do administrador inicial (upsert no boot). |
| `ADMIN_PASSWORD` | Senha do administrador inicial (≥ 8 caracteres; upsert no boot). |
| `SEED_USERS` | Opcional. `email\|ADMIN\|senha;email\|OPERATOR\|senha` para upsert rápido em dev (ex.: operador de teste). |

`.env` está no `.gitignore`. Fotos em `storage/products/` também.

Desenvolvimento local típico: banco `viabilidade` em `localhost:5432`, usuários de seed `admin@viabilidade.local` e `operador@viabilidade.local`. Em produção, prefira um papel Postgres sem superuser para o RLS valer; com `postgres`, o RLS é ignorado e o isolamento depende de `scope.ts`.

```bash
npm install
node --env-file=.env scripts/ensure-database.mjs
npx prisma migrate deploy
npm run dev
```

O boot (`src/instrumentation.ts`) recusa subir sem conexão ao banco (`resolveDatabaseUrl`), `SESSION_SECRET`, `ADMIN_EMAIL` e `ADMIN_PASSWORD`, sincroniza o admin (e entradas de `SEED_USERS` se definido), e cria a linha de parâmetros (venda 8%, operacional 5%, câmbio e demais alíquotas nulos) se ela ainda não existir. Durante `next build` o seed não roda.

Service worker fica desligado em `next dev` e ativo no build de produção. A página offline é `/offline`.

## 12. Ao atualizar este documento

Se mudar rota, campo, status, papel, fórmula ou cache, atualize a capa, o mapa, a ficha, a regra, o guia e esta seção na mesma entrega. Não copie senha real para cá.
