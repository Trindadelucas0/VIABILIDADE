"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Badge, EmptyState, ErrorState, PageIntro, Skeleton } from "../../../components/ui";
import { api, ApiError } from "../../../lib/api";
import { formatBrl, formatMargin } from "../../../lib/format";
import { CLASS_LABEL } from "../../../lib/labels";
import type { CompareItem } from "../../../lib/types";

function ComparePage() {
  const params = useSearchParams();
  const idsParam = params.get("ids") ?? "";
  const ids = idsParam.split(",").map((id) => id.trim()).filter(Boolean);
  const [items, setItems] = useState<CompareItem[] | null>(null);
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
    if (selected.length === 0) return;
    let active = true;
    setLoading(true);
    api<{ items: CompareItem[] }>("/api/analyses/compare", {
      method: "POST",
      body: JSON.stringify({ ids: selected }),
    })
      .then((data) => {
        if (active) {
          setItems(data.items);
          setError("");
        }
      })
      .catch((caught) => {
        if (active) setError(caught instanceof ApiError ? caught.message : "Sem conexão. Os dados precisam de internet.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [idsParam]);

  return (
    <div className="mx-auto grid max-w-5xl gap-5">
      <PageIntro title="Comparação" subtitle="Usa a última análise gravada. Não recalcula nesta tela." />
      {ids.length === 0 ? (
        <EmptyState title="Selecione produtos no catálogo" action={<Link href="/produtos">Ir para produtos</Link>} />
      ) : null}
      {loading ? <Skeleton className="h-40" /> : null}
      {error ? <ErrorState message={error} /> : null}
      {items ? (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-line">
                  <th className="py-3 pr-4">Produto</th>
                  <th className="py-3 pr-4">Custo final</th>
                  <th className="py-3 pr-4">Preço Brasil</th>
                  <th className="py-3 pr-4">Resultado líquido</th>
                  <th className="py-3">Margem</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-line">
                    <td className="py-3 pr-4">
                      {item.found ? (
                        <Link href={item.analysis ? `/produtos/${item.id}/resultado` : `/produtos/${item.id}`}>{item.name || "Sem nome"}</Link>
                      ) : (
                        "Produto não encontrado"
                      )}
                    </td>
                    {item.found && item.analysis ? (
                      <>
                        <td className="py-3 pr-4">{formatBrl(item.analysis.final_cost_brl)}</td>
                        <td className="py-3 pr-4">{formatBrl(item.analysis.market_price_brl)}</td>
                        <td className="py-3 pr-4">{formatBrl(item.analysis.net_result_brl)}</td>
                        <td className="py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-emphasis">{formatMargin(item.analysis.margin)}</span>
                            <Badge tone={item.analysis.classification === "EXCELENTE" || item.analysis.classification === "BOM" ? "ok" : "info"}>
                              {CLASS_LABEL[item.analysis.classification]}
                            </Badge>
                          </div>
                        </td>
                      </>
                    ) : (
                      <td className="py-3" colSpan={4}>
                        {item.found ? reasons[item.id] || "Sem análise" : "Sem análise"}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="grid gap-3 md:hidden">
            {items.map((item) => (
              <li key={item.id} className="rounded-xl border border-line bg-surface p-4">
                {!item.found ? <p>Produto não encontrado</p> : null}
                {item.found ? (
                  <Link href={item.analysis ? `/produtos/${item.id}/resultado` : `/produtos/${item.id}`} className="grid gap-2 no-underline">
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-semibold text-ink">{item.name || "Sem nome"}</span>
                      {item.analysis ? <span className="text-display shrink-0">{formatMargin(item.analysis.margin)}</span> : null}
                    </div>
                    {item.analysis ? (
                      <>
                        <Badge tone={item.analysis.classification === "EXCELENTE" || item.analysis.classification === "BOM" ? "ok" : "info"}>
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
                            <dd className="font-semibold">{formatBrl(item.analysis.net_result_brl)}</dd>
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
