"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { IconBack } from "../../../../../components/icons";
import { Button, classificationSurface, ErrorState, Skeleton, useToast } from "../../../../../components/ui";
import { api, ApiError } from "../../../../../lib/api";
import { formatBrl, formatExchange, formatMargin, formatUsd, formatWhen } from "../../../../../lib/format";
import { CLASS_HINT, CLASS_LABEL } from "../../../../../lib/labels";
import { notifySaved } from "../../../../../lib/notify";
import type { ProductDetail, User } from "../../../../../lib/types";

function ResultPage() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [missing, setMissing] = useState<string[]>([]);

  async function load() {
    setLoading(true);
    try {
      const [me, detail] = await Promise.all([
        api<User>("/api/auth/me"),
        api<ProductDetail>(`/api/products/${params.id}`),
      ]);
      setUser(me);
      setProduct(detail);
      setError("");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Sem conexão. Os dados precisam de internet.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function reanalyze() {
    if (!product) return;
    setBusy(true);
    setMissing([]);
    try {
      await api(`/api/products/${product.id}/reanalysis`, { method: "POST" });
      await notifySaved("analyzed", product.name);
      toast("Nova análise registrada. A anterior continua no histórico.");
      router.replace(`/produtos/${product.id}/resultado`);
      await load();
    } catch (caught) {
      if (caught instanceof ApiError && caught.missing) setMissing(caught.missing);
      toast(caught instanceof ApiError ? caught.message : "Sem conexão. Os dados precisam de internet.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Skeleton className="h-64" />;
  if (error || !product) return <ErrorState message={error || "Produto não encontrado"} onRetry={() => void load()} />;

  const selectedId = search.get("analise");
  const analysis = product.analyses.find((item) => item.id === selectedId) ?? product.analyses[0];

  return (
    <div className="mx-auto grid max-w-xl gap-6">
      <Link href={`/produtos/${product.id}`} className="inline-flex min-h-11 items-center gap-2 font-semibold no-underline">
        <IconBack /> Produto
      </Link>
      <h1 className="text-2xl font-semibold">{product.name || "Sem nome"}</h1>
      {!analysis ? (
        <p>Sem análise</p>
      ) : (
        <>
          <section
            className={`grid justify-items-center gap-1 rounded-xl border px-4 py-8 text-center ${classificationSurface(analysis.classification)}`}
          >
            <p className="text-display">{formatMargin(analysis.margin)}</p>
            <p className="text-sm text-muted">Margem líquida</p>
            <p className="text-emphasis mt-3">{CLASS_LABEL[analysis.classification]}</p>
            <p className="text-sm text-muted">{CLASS_HINT[analysis.classification]}</p>
            <p className="mt-2 text-sm text-muted">
              Análise #{analysis.sequence} · versão {analysis.parameter_version} · {formatWhen(analysis.created_at)}
            </p>
          </section>
          <section className="section-card grid gap-3">
            <h2 className="section-title">De onde veio o custo</h2>
            <dl className="grid gap-3">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Preço na feira</dt>
                <dd className="font-semibold">{formatUsd(analysis.composition.fair_price_usd)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Câmbio da análise</dt>
                <dd className="text-right font-semibold">{formatExchange(analysis.composition.exchange_rate)}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-line pb-3">
                <dt className="text-muted">
                  Valor convertido
                  <span className="mt-0.5 block text-xs font-normal">preço na feira × câmbio</span>
                </dt>
                <dd className="font-semibold">{formatBrl(analysis.composition.fob_brl)}</dd>
              </div>
            </dl>
          </section>
          <dl className="section-card gap-3">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Preço Brasil</dt>
              <dd>{formatBrl(analysis.composition.market_price_brl)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Custo final</dt>
              <dd>{formatBrl(analysis.composition.final_cost_brl)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Resultado bruto</dt>
              <dd>{formatBrl(analysis.composition.gross_result_brl)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Impostos sobre venda</dt>
              <dd>{formatBrl(analysis.composition.sales_tax_brl)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Custo operacional</dt>
              <dd>{formatBrl(analysis.composition.operational_cost_brl)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-line pt-3">
              <dt className="font-semibold">Resultado líquido</dt>
              <dd className="text-emphasis">{formatBrl(analysis.composition.net_result_brl)}</dd>
            </div>
          </dl>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/produtos/${product.id}/composicao?analise=${analysis.id}`}
              className="inline-flex min-h-11 items-center rounded-lg border border-line bg-surface px-4 font-semibold no-underline text-ink"
            >
              Ver composição
            </Link>
            <Button variant="secondary" disabled={busy} onClick={() => void reanalyze()}>
              {busy ? "Reanalisando…" : "Reanalisar"}
            </Button>
            {user?.role === "ADMIN" ? (
              <Link href="/parametros" className="inline-flex min-h-11 items-center rounded-lg border border-line bg-surface px-4 font-semibold no-underline text-ink">
                Alterar parâmetros
              </Link>
            ) : (
              <button type="button" className="min-h-11 rounded-lg border border-line px-4 font-semibold text-muted" disabled>
                Só o admin altera os parâmetros
              </button>
            )}
          </div>
          {missing.length > 0 ? (
            <ul className="list-disc pl-5 text-danger">
              {missing.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
        </>
      )}
      <section className="grid gap-2">
        <h2 className="section-title">Histórico</h2>
        {product.analyses.length === 0 ? <p className="text-muted">Nenhuma análise ainda.</p> : null}
        <ol className="grid gap-2">
          {product.analyses.map((item) => {
            const current = item.id === analysis?.id;
            return (
              <li key={item.id}>
                <Link
                  href={`/produtos/${product.id}/resultado?analise=${item.id}`}
                  className={`flex min-h-11 items-center justify-between rounded-xl border bg-surface px-4 no-underline ${current ? "border-accent ring-1 ring-accent" : "border-line"}`}
                  aria-current={current ? "page" : undefined}
                >
                  <span className="font-semibold text-ink">
                    #{item.sequence} · <span className="text-emphasis">{formatMargin(item.margin)}</span> · {CLASS_LABEL[item.classification]}
                  </span>
                  <span className="text-sm text-muted">v{item.parameter_version}</span>
                </Link>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

export default function ResultadoRoute() {
  return (
    <Suspense fallback={<Skeleton className="h-64" />}>
      <ResultPage />
    </Suspense>
  );
}
