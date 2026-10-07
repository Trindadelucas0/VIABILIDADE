"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ScopeToggle } from "../../../components/scope-toggle";
import { Badge, Button, EmptyState, ErrorState, PageIntro, Skeleton, useToast } from "../../../components/ui";
import { api, ApiError } from "../../../lib/api";
import { formatMargin, formatUsd } from "../../../lib/format";
import { CLASS_LABEL, STATUS_LABEL } from "../../../lib/labels";
import { notifySaved } from "../../../lib/notify";
import type { BatchResult, Catalog, User } from "../../../lib/types";

function badgeTone(status: string, classification?: string) {
  if (classification === "EXCELENTE" || classification === "BOM") return "ok" as const;
  if (classification === "MEDIO") return "info" as const;
  if (classification === "FRACO" || status === "PENDING") return "warn" as const;
  if (classification === "RUIM" || status === "ARCHIVED") return "danger" as const;
  return "neutral" as const;
}

function CatalogPage() {
  const params = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState(params.get("q") ?? "");

  const query = params.toString();

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([api<User>("/api/auth/me"), api<Catalog>(`/api/products?${query}`)])
      .then(([me, data]) => {
        if (!active) return;
        setUser(me);
        setCatalog(data);
        setError("");
      })
      .catch((caught) => {
        if (!active) return;
        setError(caught instanceof ApiError ? caught.message : "Sem conexão. Os dados precisam de internet.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [query]);

  function replaceQuery(next: URLSearchParams) {
    const text = next.toString();
    router.replace(text ? `/produtos?${text}` : "/produtos");
  }

  function setFilter(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    replaceQuery(next);
  }

  const filtering = Boolean(params.get("q") || params.get("status") || params.get("classificacao"));

  async function analyzeSelected() {
    setBusy(true);
    try {
      const result = await api<BatchResult>("/api/analyses/batch", {
        method: "POST",
        body: JSON.stringify({ ids: selected }),
      });
      sessionStorage.setItem("viabilidade_skipped", JSON.stringify(result.skipped));
      if (result.analyzed[0]) {
        await notifySaved("analyzed", "Seleção");
        toast("Análise em lote concluída.");
      } else {
        toast("Nenhum produto da seleção pôde ser analisado.");
      }
      router.push(`/comparar?ids=${selected.join(",")}`);
    } catch (caught) {
      toast(caught instanceof ApiError ? caught.message : "Sem conexão. Os dados precisam de internet.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-5">
      <PageIntro title="Produtos" />
      {user?.role === "ADMIN" ? <ScopeToggle /> : null}
      <form
        className="grid gap-3 md:grid-cols-[1fr_auto_220px_220px]"
        onSubmit={(event) => {
          event.preventDefault();
          setFilter("q", q.trim());
        }}
      >
        <label className="field grid gap-2 md:col-span-1">
          <span className="text-sm font-semibold">Buscar</span>
          <input value={q} onChange={(event) => setQ(event.target.value)} />
        </label>
        <div className="flex items-end md:col-span-1">
          <Button type="submit" className="w-full md:w-auto">
            Buscar
          </Button>
        </div>
        <label className="field grid gap-2">
          <span className="text-sm font-semibold">Status</span>
          <select value={params.get("status") ?? ""} onChange={(event) => setFilter("status", event.target.value)}>
            <option value="">Ativos</option>
            <option value="PENDING">Pendente</option>
            <option value="READY_FOR_ANALYSIS">Pronto para análise</option>
            <option value="ANALYZED">Analisado</option>
            <option value="ARCHIVED">Arquivados</option>
            <option value="DRAFT">Rascunho</option>
          </select>
        </label>
        <label className="field grid gap-2">
          <span className="text-sm font-semibold">Classificação</span>
          <select value={params.get("classificacao") ?? ""} onChange={(event) => setFilter("classificacao", event.target.value)}>
            <option value="">Todas</option>
            <option value="RUIM">Ruim</option>
            <option value="FRACO">Fraco</option>
            <option value="MEDIO">Médio</option>
            <option value="BOM">Bom</option>
            <option value="EXCELENTE">Excelente</option>
          </select>
        </label>
      </form>
      {loading ? <Skeleton className="h-40" /> : null}
      {error ? <ErrorState message={error} onRetry={() => router.refresh()} /> : null}
      {catalog && !loading && catalog.products.length === 0 ? (
        filtering ? (
          <EmptyState
            title="Nenhum produto com esse filtro"
            action={
              <Button variant="secondary" onClick={() => router.replace(user?.role === "ADMIN" && params.get("scope") === "mine" ? "/produtos?scope=mine" : "/produtos")}>
                Limpar
              </Button>
            }
          />
        ) : (
          <EmptyState title="Nenhum produto ainda" action={<Link href="/produtos/novo">Cadastrar produto</Link>} />
        )
      ) : null}
      <ul className="grid gap-3">
        {catalog?.products.map((product) => {
          const checked = selected.includes(product.id);
          const label = product.latest_analysis ? CLASS_LABEL[product.latest_analysis.classification] : STATUS_LABEL[product.status];
          return (
            <li key={product.id} className="grid grid-cols-[44px_1fr] items-stretch rounded-xl border border-line bg-surface">
              <label className="flex items-center justify-center">
                <input
                  type="checkbox"
                  className="size-5"
                  checked={checked}
                  aria-label={`Selecionar ${product.name || "produto"}`}
                  onChange={() =>
                    setSelected((current) => (checked ? current.filter((id) => id !== product.id) : [...current, product.id]))
                  }
                />
              </label>
              <Link href={`/produtos/${product.id}`} className="grid grid-cols-[1fr_auto] items-start gap-2 py-3 pr-4 no-underline">
                <span className="grid min-w-0 gap-1">
                  <span className="font-semibold text-ink">{product.name || "Sem nome"}</span>
                  <span className="text-sm text-muted">
                    {formatUsd(product.fair_price_usd)}
                    {product.stand ? ` · Stand ${product.stand}` : ""}
                    {product.supplier_name ? ` · ${product.supplier_name}` : ""}
                  </span>
                  <Badge tone={badgeTone(product.status, product.latest_analysis?.classification)}>{label}</Badge>
                </span>
                {product.latest_analysis ? (
                  <span className="text-emphasis shrink-0">{formatMargin(product.latest_analysis.margin)}</span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
      {selected.length > 0 ? (
        <div className="sticky bottom-24 z-10 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface p-3 md:bottom-4">
          <p className="font-semibold">
            {selected.length} selecionado{selected.length > 1 ? "s" : ""}
          </p>
          <Button disabled={busy} onClick={() => void analyzeSelected()}>
            {busy ? "Analisando…" : "Analisar selecionados"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-40" />}>
      <CatalogPage />
    </Suspense>
  );
}
