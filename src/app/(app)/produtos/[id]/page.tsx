"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { IconBack } from "../../../../components/icons";
import { MoneyField } from "../../../../components/money-field";
import { Badge, Button, classificationSurface, ConfirmDialog, ErrorState, Field, SectionCard, Skeleton, useToast } from "../../../../components/ui";
import { api, ApiError } from "../../../../lib/api";
import { formatMargin, formatUsd, formatWhen } from "../../../../lib/format";
import { CLASS_HINT, CLASS_LABEL, STATUS_LABEL } from "../../../../lib/labels";
import { notifySaved } from "../../../../lib/notify";
import {
  OTHER_TEXT_MAX,
  PRICE_SOURCES,
  parsePriceReference,
  priceReferenceError,
  serializePriceReference,
  type PriceReferenceState,
  type PriceSource,
} from "../../../../lib/price-reference";
import type { Classification, ProductDetail, User } from "../../../../lib/types";

/** Igual a MAX_IMAGES_PER_PRODUCT em src/server/images/validate-image.ts. */
const MAX_IMAGES_PER_PRODUCT = 10;

function badgeTone(status: string, classification?: string) {
  if (classification === "EXCELENTE" || classification === "BOM") return "ok" as const;
  if (classification === "MEDIO") return "info" as const;
  if (classification === "FRACO" || status === "PENDING") return "warn" as const;
  if (classification === "RUIM" || status === "ARCHIVED") return "danger" as const;
  return "neutral" as const;
}

const MARGIN_TEXT: Record<Classification, string> = {
  RUIM: "text-danger",
  FRACO: "text-warn",
  MEDIO: "text-accent",
  BOM: "text-ok",
  EXCELENTE: "text-ok",
};

const MARGIN_RING: Record<Classification, string> = {
  RUIM: "hover:ring-danger active:ring-danger",
  FRACO: "hover:ring-warn active:ring-warn",
  MEDIO: "hover:ring-accent active:ring-accent",
  BOM: "hover:ring-ok active:ring-ok",
  EXCELENTE: "hover:ring-ok active:ring-ok",
};

export default function ProductPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const maisRef = useRef<HTMLDetailsElement>(null);
  const [user, setUser] = useState<User | null>(null);
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState<"archive" | "delete" | null>(null);
  const [form, setForm] = useState({
    name: "",
    code: "",
    segment: "",
    stand: "",
    notes: "",
    fair_price_usd: "",
    brazil_price_brl: "",
    brazil_price_notes: "",
    supplier_number: "",
    supplier_name: "",
    supplier_phone: "",
    supplier_notes: "",
  });
  const [priceRef, setPriceRef] = useState<PriceReferenceState>(() => parsePriceReference(null));

  async function load() {
    setLoading(true);
    try {
      const [me, detail] = await Promise.all([
        api<User>("/api/auth/me"),
        api<ProductDetail>(`/api/products/${params.id}`),
      ]);
      setUser(me);
      setProduct(detail);
      setForm({
        name: detail.name,
        code: detail.code ?? "",
        segment: detail.segment ?? "",
        stand: detail.stand ?? "",
        notes: detail.notes ?? "",
        fair_price_usd: detail.fair_price_usd ?? "",
        brazil_price_brl: detail.brazil_price_brl ?? "",
        brazil_price_notes: detail.brazil_price_notes ?? "",
        supplier_number: detail.supplier?.number ?? "",
        supplier_name: detail.supplier?.name ?? "",
        supplier_phone: detail.supplier?.phone ?? "",
        supplier_notes: detail.supplier?.notes ?? "",
      });
      setPriceRef(parsePriceReference(detail.brazil_price_reference));
      setError("");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Sem conexão. Os dados precisam de internet.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // Recarrega só quando o id muda. `load` lê o id atual.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleSource(source: PriceSource) {
    setPriceRef((current) => {
      const checked = current.sources.includes(source);
      return {
        ...current,
        sources: checked ? current.sources.filter((item) => item !== source) : [...current.sources, source],
      };
    });
  }

  function openConfirm(next: "archive" | "delete") {
    if (maisRef.current) maisRef.current.open = false;
    setConfirm(next);
  }

  async function save() {
    if (!product) return;
    setFields({});
    const refError = priceReferenceError(priceRef);
    if (refError) {
      setFields({ brazil_price_reference: refError });
      toast("Revise os campos.");
      return;
    }
    setSaving(true);
    try {
      const updated = await api<ProductDetail>(`/api/products/${product.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: form.name,
          code: form.code,
          segment: form.segment,
          stand: form.stand,
          notes: form.notes,
          fair_price_usd: form.fair_price_usd,
          brazil_price_brl: form.brazil_price_brl,
          brazil_price_notes: form.brazil_price_notes,
          brazil_price_reference: serializePriceReference(priceRef),
          supplier_id: product.supplier?.id ?? null,
          supplier: {
            number: form.supplier_number,
            name: form.supplier_name,
            phone: form.supplier_phone,
            notes: form.supplier_notes,
          },
        }),
      });
      setProduct(updated);
      setPriceRef(parsePriceReference(updated.brazil_price_reference));
      toast("Produto salvo.");
    } catch (caught) {
      if (caught instanceof ApiError) {
        setFields(caught.fields ?? {});
        toast(caught.message);
      } else toast("Sem conexão. Os dados precisam de internet.");
    } finally {
      setSaving(false);
    }
  }

  async function analyze() {
    if (!product) return;
    setSaving(true);
    try {
      await api(`/api/products/${product.id}/analysis`, { method: "POST" });
      await notifySaved("analyzed", product.name);
      toast("Análise concluída.");
      router.push(`/produtos/${product.id}/resultado`);
    } catch (caught) {
      toast(caught instanceof ApiError ? caught.message : "Sem conexão. Os dados precisam de internet.");
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function archive() {
    if (!product) return;
    setConfirm(null);
    await api(`/api/products/${product.id}`, { method: "PATCH", body: JSON.stringify({ archive: true }) });
    toast("Produto arquivado.");
    router.push("/produtos");
  }

  async function remove() {
    if (!product) return;
    setConfirm(null);
    await api(`/api/products/${product.id}`, { method: "DELETE" });
    toast("Produto excluído.");
    router.push("/produtos");
  }

  async function upload(file: File | null) {
    if (!file || !product) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      await api(`/api/products/${product.id}/images`, { method: "POST", body: formData });
      toast("Foto adicionada.");
      await load();
    } catch (caught) {
      toast(caught instanceof ApiError ? caught.message : "Sem conexão. Os dados precisam de internet.");
    }
  }

  async function removeImage(imageId: string) {
    if (!product) return;
    await api(`/api/products/${product.id}/images/${imageId}`, { method: "DELETE" });
    await load();
  }

  if (loading) return <Skeleton className="h-64" />;
  if (error || !product) return <ErrorState message={error || "Produto não encontrado"} onRetry={() => void load()} />;

  const cover = product.images[0];
  const brazilPriceEmpty = !form.brazil_price_brl.trim();
  const photoLimit = product.images.length >= MAX_IMAGES_PER_PRODUCT;
  const canArchive = product.status !== "ARCHIVED";
  const canDelete = user?.role === "ADMIN";
  const showMore = canArchive || canDelete;
  const latest = product.latest_analysis;
  const blockAnalyze = !product.can_analyze && product.status !== "ARCHIVED";

  return (
    <div className="mx-auto grid max-w-6xl gap-6 pb-40 min-[960px]:pb-0">
      <div className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/produtos"
            className="-ml-2 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 font-semibold text-accent no-underline transition-colors duration-150 hover:bg-bg"
          >
            <IconBack /> Produtos
          </Link>
          {showMore ? (
            <details ref={maisRef} className="more-menu relative">
              <summary className="inline-flex min-h-11 cursor-pointer list-none items-center rounded-lg border border-line bg-surface px-4 text-base font-semibold text-ink transition-[transform,background-color] duration-150 hover:bg-bg active:scale-[0.98] [&::-webkit-details-marker]:hidden">
                Mais
              </summary>
              <div className="absolute right-0 z-30 mt-2 grid min-w-44 overflow-hidden rounded-lg border border-line bg-surface">
                {canArchive ? (
                  <button
                    type="button"
                    className="min-h-11 px-4 text-left text-base font-semibold text-ink transition-colors duration-150 hover:bg-bg"
                    onClick={() => openConfirm("archive")}
                  >
                    Arquivar
                  </button>
                ) : null}
                {canDelete ? (
                  <button
                    type="button"
                    className="min-h-11 px-4 text-left text-base font-semibold text-danger transition-colors duration-150 hover:bg-danger-soft"
                    onClick={() => openConfirm("delete")}
                  >
                    Excluir
                  </button>
                ) : null}
              </div>
            </details>
          ) : null}
        </div>
        <h1 className="page-title">{product.name || "Sem nome"}</h1>
      </div>

      <div className="product-sheet">
        <div className="grid min-w-0 content-start gap-6">
          <SectionCard className="order-1 min-[960px]:order-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={badgeTone(product.status, latest?.classification)}>{STATUS_LABEL[product.status]}</Badge>
              {product.stand ? <span className="text-sm text-muted">Stand {product.stand}</span> : null}
            </div>
            <p className="text-emphasis text-ink">{formatUsd(product.fair_price_usd)}</p>
            {latest ? (
              <Link
                href={`/produtos/${product.id}/resultado`}
                className={`grid gap-1 rounded-xl border px-4 py-4 no-underline transition-[box-shadow] duration-150 hover:ring-2 active:ring-2 ${classificationSurface(latest.classification)} ${MARGIN_RING[latest.classification]}`}
              >
                <p className={`product-margin-figure text-emphasis ${MARGIN_TEXT[latest.classification]}`}>{formatMargin(latest.margin)}</p>
                <p className={`font-semibold ${MARGIN_TEXT[latest.classification]}`}>{CLASS_LABEL[latest.classification]}</p>
                <p className="text-sm text-muted">{CLASS_HINT[latest.classification]}</p>
                <span className="font-semibold text-accent">Ver última análise</span>
              </Link>
            ) : (
              <p className="text-sm text-muted">Sem análise</p>
            )}
          </SectionCard>

          {product.missing.length > 0 ? (
            <section className="order-2 rounded-xl border border-warn bg-warn-soft p-4 min-[960px]:order-4">
              <h2 className="section-title">Falta</h2>
              <ul className="mt-2 list-disc pl-5">
                {product.missing.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}

          <SectionCard className="order-3 min-[960px]:order-1">
            {cover ? (
              <img
                src={cover.url}
                alt={product.name || "Foto do produto"}
                className="max-h-80 w-full rounded-xl border border-line bg-surface object-contain"
              />
            ) : (
              <div className="grid min-h-40 place-items-center rounded-xl border border-dashed border-line bg-surface text-sm text-muted">
                Sem imagem
              </div>
            )}
            {product.images.length > 0 ? (
              <ul className="flex gap-3 overflow-x-auto pb-2">
                {product.images.map((image) => (
                  <li key={image.id} className="grid w-28 shrink-0 gap-2">
                    <img src={image.url} alt="" className="h-28 w-28 rounded-lg border border-line object-cover" />
                    <button
                      type="button"
                      className="min-h-11 rounded-lg text-sm font-semibold text-danger transition-colors duration-150 hover:bg-danger-soft"
                      onClick={() => void removeImage(image.id)}
                    >
                      Remover
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <label
              aria-disabled={photoLimit}
              className={`relative inline-flex min-h-11 items-center justify-center overflow-hidden rounded-lg border border-line bg-surface px-4 text-base font-semibold text-ink transition-[transform,background-color] duration-150 ${photoLimit ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-bg active:scale-[0.98]"}`}
              onClick={(event) => {
                if (photoLimit) event.preventDefault();
              }}
            >
              Adicionar foto
              <input
                className="absolute inset-0 opacity-0 disabled:cursor-not-allowed"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={photoLimit}
                tabIndex={photoLimit ? -1 : 0}
                onChange={(event) => {
                  const input = event.currentTarget;
                  const file = input.files?.[0] ?? null;
                  input.value = "";
                  void upload(file);
                }}
              />
            </label>
            <p className="text-sm text-muted">Até 10 fotos por produto.</p>
          </SectionCard>
        </div>

        <div className="grid min-w-0 content-start gap-6">
          <SectionCard title="Preços" className="section-card-roomy">
            <Field label="Preço na feira (USD)" error={fields.fair_price_usd}>
              {(id) => (
                <MoneyField id={id} currency="USD" value={form.fair_price_usd} onChange={(value) => set("fair_price_usd", value)} />
              )}
            </Field>
            <Field
              label="Preço no Brasil (R$)"
              hint={brazilPriceEmpty ? "Preencha para poder analisar." : undefined}
              error={fields.brazil_price_brl}
            >
              {(id) => (
                <MoneyField
                  id={id}
                  currency="BRL"
                  accent={brazilPriceEmpty}
                  value={form.brazil_price_brl}
                  onChange={(value) => set("brazil_price_brl", value)}
                />
              )}
            </Field>
            <fieldset className="grid gap-2">
              <legend className="text-sm font-semibold">Referência do preço</legend>
              {PRICE_SOURCES.map((source) => {
                const checked = priceRef.sources.includes(source);
                return (
                  <label key={source} className="flex min-h-11 items-center gap-3">
                    <input
                      type="checkbox"
                      className="size-5"
                      checked={checked}
                      onChange={() => toggleSource(source)}
                    />
                    {source}
                  </label>
                );
              })}
              <label className="flex min-h-11 items-center gap-3">
                <input
                  type="checkbox"
                  className="size-5"
                  checked={priceRef.otherOn}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setPriceRef((current) => ({
                      ...current,
                      otherOn: checked,
                      otherText: checked ? current.otherText : "",
                    }));
                  }}
                />
                Outros
              </label>
              {priceRef.otherOn ? (
                <div className="field grid gap-2">
                  <input
                    value={priceRef.otherText}
                    maxLength={OTHER_TEXT_MAX}
                    placeholder="Qual referência?"
                    aria-invalid={Boolean(fields.brazil_price_reference)}
                    onChange={(event) => setPriceRef((current) => ({ ...current, otherText: event.target.value }))}
                  />
                </div>
              ) : null}
              {fields.brazil_price_reference ? <span className="text-sm text-danger">{fields.brazil_price_reference}</span> : null}
            </fieldset>
            <Field label="Observação do preço">
              {(id) => <textarea id={id} rows={2} value={form.brazil_price_notes} onChange={(event) => set("brazil_price_notes", event.target.value)} />}
            </Field>
          </SectionCard>
          <SectionCard title="Produto">
            <Field label="Nome" error={fields.name}>
              {(id) => <input id={id} value={form.name} onChange={(event) => set("name", event.target.value)} />}
            </Field>
            <Field label="Código">
              {(id) => <input id={id} value={form.code} onChange={(event) => set("code", event.target.value)} />}
            </Field>
            <Field label="Segmento">
              {(id) => <input id={id} value={form.segment} onChange={(event) => set("segment", event.target.value)} />}
            </Field>
            <Field label="Stand">
              {(id) => <input id={id} value={form.stand} onChange={(event) => set("stand", event.target.value)} />}
            </Field>
            <Field label="Observações">
              {(id) => <textarea id={id} rows={3} value={form.notes} onChange={(event) => set("notes", event.target.value)} />}
            </Field>
          </SectionCard>
          <SectionCard title="Fornecedor">
            <Field label="Número">
              {(id) => <input id={id} value={form.supplier_number} onChange={(event) => set("supplier_number", event.target.value)} />}
            </Field>
            <Field label="Nome" hint="Entra na análise." hintTone="accent" error={fields["supplier.name"]}>
              {(id) => <input id={id} value={form.supplier_name} onChange={(event) => set("supplier_name", event.target.value)} />}
            </Field>
            <Field label="Telefone">
              {(id) => <input id={id} inputMode="tel" value={form.supplier_phone} onChange={(event) => set("supplier_phone", event.target.value)} />}
            </Field>
            <Field label="Obs">
              {(id) => <textarea id={id} rows={2} value={form.supplier_notes} onChange={(event) => set("supplier_notes", event.target.value)} />}
            </Field>
          </SectionCard>
          <SectionCard title="Histórico" className="section-card-roomy">
            {product.analyses.length === 0 ? <p className="text-sm text-muted">Nenhuma análise ainda.</p> : null}
            <ol className="grid gap-2">
              {product.analyses.map((analysis) => (
                <li key={analysis.id}>
                  <Link
                    href={`/produtos/${product.id}/resultado?analise=${analysis.id}`}
                    className="grid min-h-11 gap-1 rounded-lg px-3 py-2 no-underline transition-colors duration-150 hover:bg-bg active:bg-bg"
                  >
                    <span className="font-semibold text-ink">
                      #{analysis.sequence}
                      {" · "}
                      <span className={`font-semibold ${MARGIN_TEXT[analysis.classification]}`}>
                        {formatMargin(analysis.margin)} · {CLASS_LABEL[analysis.classification]}
                      </span>
                    </span>
                    <span className="text-sm text-muted">{formatWhen(analysis.created_at)}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </SectionCard>
          <div className="sticky-action-bar">
            {blockAnalyze ? (
              <p className="text-sm text-muted">
                Analisar fica disponível quando nome, preços, fornecedor, câmbio e alíquotas estiverem preenchidos.
              </p>
            ) : null}
            <div className="flex items-center justify-between gap-3">
              <Button variant="secondary" disabled={saving} onClick={() => void save()}>
                Salvar
              </Button>
              <Button disabled={saving || !product.can_analyze} onClick={() => void analyze()}>
                {saving ? "Analisando…" : "Analisar"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirm === "archive"}
        title={`Arquivar ${product.name || "este produto"}?`}
        body="O catálogo esconde este produto até o filtro Arquivados."
        confirmLabel="Arquivar"
        onConfirm={() => void archive()}
        onClose={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === "delete"}
        title={`Excluir ${product.name || "este produto"}?`}
        body="As fotos também serão apagadas. Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        danger
        onConfirm={() => void remove()}
        onClose={() => setConfirm(null)}
      />
    </div>
  );
}
