"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { IconBack } from "../../../../../components/icons";
import { ErrorState, Skeleton } from "../../../../../components/ui";
import { api, ApiError } from "../../../../../lib/api";
import { formatBrl, formatMargin, formatPlain, formatUsd } from "../../../../../lib/format";
import type { ProductDetail } from "../../../../../lib/types";

function CompositionPage() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<ProductDetail>(`/api/products/${params.id}`)
      .then(setProduct)
      .catch((caught) => setError(caught instanceof ApiError ? caught.message : "Sem conexão. Os dados precisam de internet."))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <Skeleton className="h-64" />;
  if (error || !product) return <ErrorState message={error || "Produto não encontrado"} />;

  const analysis = product.analyses.find((item) => item.id === search.get("analise")) ?? product.analyses[0];
  if (!analysis) {
    return (
      <div className="mx-auto grid max-w-xl gap-4">
        <Link href={`/produtos/${product.id}/resultado`} className="inline-flex min-h-11 items-center gap-2 font-semibold no-underline">
          <IconBack /> Resultado
        </Link>
        <p>Sem análise</p>
      </div>
    );
  }

  const rows = [
    ["Preço na feira", formatUsd(analysis.composition.fair_price_usd)],
    ["Câmbio", formatPlain(analysis.composition.exchange_rate)],
    ["FOB convertido", formatBrl(analysis.composition.fob_brl)],
    ["Impostos importação", formatBrl(analysis.composition.import_tax_brl)],
    ["Nacionalização", formatBrl(analysis.composition.nationalization_brl)],
    ["Frete + outros", formatBrl(analysis.composition.freight_other_brl)],
    ["Custo final", formatBrl(analysis.composition.final_cost_brl)],
    ["Preço Brasil", formatBrl(analysis.composition.market_price_brl)],
    ["Resultado bruto", formatBrl(analysis.composition.gross_result_brl)],
    ["Impostos sobre venda", `${formatBrl(analysis.composition.sales_tax_brl)} (${formatMargin(analysis.composition.sales_tax_rate)})`],
    ["Custo operacional", `${formatBrl(analysis.composition.operational_cost_brl)} (${formatMargin(analysis.composition.operational_cost_rate)})`],
    ["Resultado líquido", formatBrl(analysis.composition.net_result_brl)],
  ];

  return (
    <div className="mx-auto grid max-w-xl gap-5">
      <Link href={`/produtos/${product.id}/resultado?analise=${analysis.id}`} className="inline-flex min-h-11 items-center gap-2 font-semibold no-underline">
        <IconBack /> Resultado
      </Link>
      <h1 className="text-2xl font-semibold">Composição do custo</h1>
      <p className="text-muted">
        Análise #{analysis.sequence}, parâmetros v{analysis.parameter_version}. Estes valores foram gravados na hora e não mudam se o câmbio for alterado depois.
      </p>
      <dl className="section-card gap-3">
        {rows.map(([label, value]) => {
          const emphasis = label === "Custo final" || label === "Preço Brasil";
          const display = label === "Resultado líquido";
          return (
            <div
              key={label}
              className={`flex items-start justify-between gap-4 border-b border-line pb-3 last:border-0 last:pb-0 ${display ? "border-t border-line pt-3" : ""}`}
            >
              <dt className={emphasis || display ? "font-semibold" : "text-muted"}>{label}</dt>
              <dd className={`text-right ${display ? "text-display" : emphasis ? "text-emphasis" : "font-semibold"}`}>{value}</dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}

export default function ComposicaoRoute() {
  return (
    <Suspense fallback={<Skeleton className="h-64" />}>
      <CompositionPage />
    </Suspense>
  );
}
