"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ScopeToggle } from "../../components/scope-toggle";
import { Badge, Button, EmptyState, ErrorState, PageIntro, Skeleton } from "../../components/ui";
import { api, ApiError } from "../../lib/api";
import { formatMargin } from "../../lib/format";
import { CLASS_LABEL } from "../../lib/labels";
import type { Classification, DashboardData, User } from "../../lib/types";

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

function Dashboard() {
  const params = useSearchParams();
  const router = useRouter();
  const scope = params.get("scope") === "mine" ? "mine" : "all";
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([api<User>("/api/auth/me"), api<DashboardData>(`/api/dashboard?scope=${scope}`)])
      .then(([me, dashboard]) => {
        if (!active) return;
        setUser(me);
        setData(dashboard);
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
  }, [scope]);

  function scopeHref(href: string) {
    if (user?.role === "ADMIN" && scope === "mine") {
      return `${href}${href.includes("?") ? "&" : "?"}scope=mine`;
    }
    return href;
  }

  const cards = [
    { label: "Produtos", value: data?.counts.products ?? 0, href: "/produtos", tone: "ink" as const },
    { label: "Pendentes", value: data?.counts.pending ?? 0, href: "/produtos?status=PENDING", tone: "warn" as const },
    { label: "Analisados", value: data?.counts.analyzed ?? 0, href: "/produtos?status=ANALYZED", tone: "ink" as const },
    { label: "Excelentes", value: data?.counts.excellent ?? 0, href: "/produtos?classificacao=EXCELENTE", tone: "ok" as const },
  ];

  return (
    <div className="mx-auto grid max-w-5xl gap-6">
      <PageIntro title="Início" subtitle="O que foi coletado e o que merece atenção." />
      {user?.role === "ADMIN" ? <ScopeToggle /> : null}
      {loading ? <Skeleton className="h-28" /> : null}
      {error ? <ErrorState message={error} onRetry={() => router.refresh()} /> : null}
      {data && !loading ? (
        <>
          <section className="section-card section-card-roomy">
            <h2 className="section-title">Principais oportunidades</h2>
            {data.opportunities.length === 0 ? (
              data.counts.products === 0 ? (
                <EmptyState
                  title="Nenhum produto ainda"
                  action={
                    <Link href="/produtos/novo">
                      <Button>Cadastrar produto</Button>
                    </Link>
                  }
                />
              ) : (
                <EmptyState
                  title="Nenhum produto analisado ainda"
                  action={
                    <Link href={scopeHref("/produtos?status=PENDING")}>
                      <Button variant="secondary">Ver pendentes</Button>
                    </Link>
                  }
                />
              )
            ) : (
              <ol className="grid gap-3">
                {data.opportunities.map((item, index) => (
                  <li key={item.id}>
                    <Link
                      href={`/produtos/${item.id}`}
                      className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3 no-underline"
                    >
                      <span className="grid gap-1">
                        <span className="font-semibold text-ink">
                          {index + 1}. {item.name || "Sem nome"}
                        </span>
                        <Badge tone={classificationBadge(item.classification)}>
                          {CLASS_LABEL[item.classification]}
                        </Badge>
                      </span>
                      <span className={`text-display shrink-0 ${MARGIN_TEXT[item.classification]}`}>{formatMargin(item.margin)}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </section>
          <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {cards.map((card) => (
              <Link key={card.label} href={scopeHref(card.href)} className="rounded-xl border border-line bg-surface p-4 no-underline">
                <p className="text-sm font-semibold text-muted">{card.label}</p>
                <p
                  className={`mt-2 text-emphasis ${
                    card.tone === "warn" && card.value > 0 ? "text-warn" : card.tone === "ok" && card.value > 0 ? "text-ok" : "text-ink"
                  }`}
                >
                  {card.value}
                </p>
              </Link>
            ))}
          </section>
          <form
            className="grid gap-3 sm:grid-cols-[1fr_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              const search = new URLSearchParams();
              if (query.trim()) search.set("q", query.trim());
              if (user?.role === "ADMIN" && scope === "mine") search.set("scope", "mine");
              router.push(search.size ? `/produtos?${search}` : "/produtos");
            }}
          >
            <label className="field grid gap-2">
              <span className="text-sm font-semibold">Buscar</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nome, stand ou segmento" />
            </label>
            <div className="flex items-end">
              <Button type="submit" className="w-full sm:w-auto">
                Buscar
              </Button>
            </div>
          </form>
          <div className="flex flex-wrap gap-2">
            {[
              ["/produtos?status=PENDING", "Pendentes"],
              ["/produtos?status=ANALYZED", "Analisados"],
              ["/produtos?classificacao=BOM", "Bons"],
              ["/produtos?classificacao=EXCELENTE", "Excelentes"],
            ].map(([href, label]) => (
              <Link
                key={label}
                className="inline-flex min-h-11 items-center rounded-full border border-line bg-surface px-4 font-semibold text-ink no-underline"
                href={scopeHref(href)}
              >
                {label}
              </Link>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<Skeleton className="h-40" />}>
      <Dashboard />
    </Suspense>
  );
}
