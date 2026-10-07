import { assertSameOrigin, handle, json, readJson } from "../../../server/http";
import { requireActor } from "../../../server/auth/session";
import { resolveVisibility } from "../../../server/auth/scope";
import { createProduct, listProducts } from "../../../server/products/service";
import { productWriteSchema } from "../../../server/schemas";

export const dynamic = "force-dynamic";

function parseCatalogPage(raw: string | null): number {
  if (!raw) return 1;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return parsed;
}

export async function GET(request: Request) {
  return handle(async () => {
    const actor = await requireActor(request);
    const url = new URL(request.url);
    const catalog = await listProducts(actor, {
      q: url.searchParams.get("q")?.slice(0, 100) ?? "",
      status: url.searchParams.get("status") ?? undefined,
      classificacao: url.searchParams.get("classificacao") ?? undefined,
      visibility: resolveVisibility(actor, url.searchParams.get("scope")),
      page: parseCatalogPage(url.searchParams.get("page")),
    });
    return json(catalog);
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    assertSameOrigin(request);
    const actor = await requireActor(request);
    const input = productWriteSchema.parse(await readJson(request));
    const product = await createProduct(actor, input);
    return json(product, 201);
  });
}
