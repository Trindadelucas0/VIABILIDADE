"use client";

import Decimal from "decimal.js";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Badge, Button, EmptyState, ErrorState, PageIntro, Skeleton } from "../../../components/ui";
import { api, ApiError } from "../../../lib/api";
import { formatBrl, formatMargin } from "../../../lib/format";
import { CLASS_LABEL } from "../../../lib/labels";
import type { Catalog, Classification, CompareItem } from "../../../lib/types";

const MARGIN_TEXT: Record<Classification, string> = {
  RUIM: "text-danger",
  FRACO: "text-warn",
  MEDIO: "text-accent",
  BOM: "text-ok",
  EXCELENTE: "text-ok",
};

function classificationBadge(classification: Classification): "danger" | "warn" | "info" | "ok" {
  if (classification === "RUIM") return "danger";
  if (classification === "FRACO") return "warn";
  if (classification === "MEDIO") return "info";
  return "ok";
}

function netResultClass(value: string): string {
  const shown = formatBrl(value);
  if (shown.startsWith("-")) return "text-danger";
  const amount = new Decimal(value);
  if (amount.isZero()) return "text-ink";
  if (amount.gt(0)) return "text-ok";
  return "text-danger";
}

function CompareTable({ items, reasons }: { items: CompareItem[]; reasons: Record<string, string> }) {
  return (
    <>
      <section className="section-card section-card-roomy hidden overflow-x-auto md:grid">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-line">
              <th className="py-4 pr-4">Produto</th>
              <th className="py-4 pr-4">Custo final</th>
              <th className="py-4 pr-4">Preço Brasil</th>
              <th className="py-4 pr-4">Resultado líquido</th>
              <th className="py-4">Margem</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-line">
                <td className="py-4 pr-4">
                  {item.found ? (
                    <Link href={item.analysis ? `/produtos/${item.id}/resultado` : `/produtos/${item.id}`}>{item.name || "Sem nome"}</Link>
                  ) : (
                    "Produto não encontrado"
                  )}
                </td>
                {item.found && item.analysis ? (
                  <>
                    <td className="py-4 pr-4">{formatBrl(item.analysis.final_cost_brl)}</td>
                    <td className="py-4 pr-4">{formatBrl(item.analysis.market_price_brl)}</td>
                    <td className={`py-4 pr-4 ${netResultClass(item.analysis.net_result_brl)}`}>{formatBrl(item.analysis.net_result_brl)}</td>
                    <td className="py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-emphasis ${MARGIN_TEXT[item.analysis.classification]}`}>{formatMargin(item.analysis.margin)}</span>
                        <Badge tone={classificationBadge(item.analysis.classification)}>
                          {CLASS_LABEL[item.analysis.classification]}
                        </Badge>
                      </div>
                    </td>
                  </>
                ) : (
                  <td className="py-4" colSpan={4}>
                    {item.found ? reasons[item.id] || "Sem análise" : "Sem análise"}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <ul className="grid gap-3 md:hidden">
        {items.map((item) => (
          <li key={item.id} className="rounded-xl border border-line bg-surface p-6">
            {!item.found ? <p>Produto não encontrado</p> : null}
            {item.found ? (
              <Link href={item.analysis ? `/produtos/${item.id}/resultado` : `/produtos/${item.id}`} className="grid gap-2 no-underline">
                <div className="flex items-start justify-between gap-3">
                  <span className="font-semibold text-ink">{item.name || "Sem nome"}</span>
                  {item.analysis ? (
                    <span className={`text-display shrink-0 ${MARGIN_TEXT[item.analysis.classification]}`}>{formatMargin(item.analysis.margin)}</span>
                  ) : null}
                </div>
                {item.analysis ? (
                  <>
                    <Badge tone={classificationBadge(item.analysis.classification)}>
                      {CLASS_LABEL[item.analysis.classification]}
                    </Badge>
                    <dl className="grid gap-1 text-sm">
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted">Custo final</dt>
                        <dd className="font-semibold">{formatBrl(item.analysis.final_cost_brl)}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted">Preço Brasil</dt>
                        <dd className="font-semibold">{formatBrl(item.analysis.market_price_brl)}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted">Resultado líquido</dt>
                        <dd className={`font-semibold ${netResultClass(item.analysis.net_result_brl)}`}>{formatBrl(item.analysis.net_result_brl)}</dd>
                      </div>
                    </dl>
                  </>
                ) : (
                  <span className="text-muted">{reasons[item.id] || "Sem análise"}</span>
                )}
              </Link>
            ) : null}
          </li>
        ))}
      </ul>
    </>
  );
}

function ComparePage() {
  const params = useSearchParams();
  const router = useRouter();
  const idsParam = params.get("ids") ?? "";
  const ids = idsParam.split(",").map((id) => id.trim()).filter(Boolean);
  const selectionMode = ids.length > 0;
  const pageParam = params.get("page");
  const catalogQuery = selectionMode ? "" : `status=ANALYZED${pageParam ? `&page=${pageParam}` : ""}`;

  const [items, setItems] = useState<CompareItem[] | null>(null);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem("viabilidade_skipped");
    if (raw) {
      try {
        const skipped = JSON.parse(raw) as { id: string; reason: string }[];
        setReasons(Object.fromEntries(skipped.map((item) => [item.id, item.reason])));
      } catch {
        setReasons({});
      }
    }
  }, []);

  useEffect(() => {
    const selected = idsParam.split(",").map((id) => id.trim()).filter(Boolean);
    const browseMode = selected.length === 0;
    let active = true;
    setLoading(true);
    setError("");
    setItems(null);
    if (browseMode) setCatalog(null);

    async function load() {
      try {
        if (!browseMode) {
          const data = await api<{ items: CompareItem[] }>("/api/analyses/compare", {
            method: "POST",
            body: JSON.stringify({ ids: selected }),
          });
          if (!active) return;
          setItems(data.items);
          setCatalog(null);
        } else {
          const cat = await api<Catalog>(`/api/products?${catalogQuery}`);
          if (!active) return;
          setCatalog(cat);
          if (cat.total === 0) {
            setItems(null);
            return;
          }
          if (cat.products.length === 0) {
            setItems([]);
            return;
          }
          const productIds = cat.products.map((p) => p.id);
          const data = await api<{ items: CompareItem[] }>("/api/analyses/compare", {
            method: "POST",
            body: JSON.stringify({ ids: productIds }),
          });
          if (!active) return;
          setItems(data.items);
        }
      } catch (caught) {
        if (active) setError(caught instanceof ApiError ? caught.message : "Sem conexão. Os dados precisam de internet.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [idsParam, catalogQuery]);

  function setPage(nextPage: number) {
    const next = new URLSearchParams(params.toString());
    if (nextPage <= 1) next.delete("page");
    else next.set("page", String(nextPage));
    const suffix = next.toString();
    router.replace(suffix ? `/comparar?${suffix}` : "/comparar");
  }

  const totalPages = catalog ? Math.max(1, Math.ceil(catalog.total / catalog.page_size)) : 1;

  return (
    <div className="mx-auto grid max-w-5xl gap-5">
      <PageIntro title="Comparação" subtitle="Usa a última análise gravada. Não recalcula nesta tela." />
      {loading ? <Skeleton className="h-40" /> : null}
      {error ? <ErrorState message={error} /> : null}
      {!loading && !error && !selectionMode && catalog?.total === 0 ? (
        <EmptyState title="Nenhum produto analisado" action={<Link href="/produtos">Ir para produtos</Link>} />
      ) : null}
      {!loading && !error && !selectionMode && catalog && catalog.total > 0 && catalog.products.length === 0 ? (
        <EmptyState
          title="Nenhum produto nesta página"
          action={
            <Button variant="secondary" onClick={() => setPage(1)}>
              Primeira página
            </Button>
          }
        />
      ) : null}
      {items && items.length > 0 ? <CompareTable items={items} reasons={reasons} /> : null}
      {!loading && !selectionMode && catalog && catalog.total > catalog.page_size ? (
        <nav className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface p-3" aria-label="Páginas da comparação">
          <p className="text-sm font-semibold text-muted">
            Página {catalog.page} de {totalPages} · {catalog.total} produto{catalog.total === 1 ? "" : "s"}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" disabled={catalog.page <= 1} onClick={() => setPage(catalog.page - 1)}>
              Anterior
            </Button>
            <Button variant="secondary" disabled={catalog.page >= totalPages} onClick={() => setPage(catalog.page + 1)}>
              Próxima
            </Button>
          </div>
        </nav>
      ) : null}
    </div>
  );
}

export default function CompararRoute() {
  return (
    <Suspense fallback={<Skeleton className="h-40" />}>
      <ComparePage />
    </Suspense>
  );
}
