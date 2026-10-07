"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { IconBack } from "../../../../components/icons";
import { MoneyField } from "../../../../components/money-field";
import { Badge, Button, ConfirmDialog, ErrorState, Field, PageIntro, SectionCard, Skeleton, useToast } from "../../../../components/ui";
import { api, ApiError } from "../../../../lib/api";
import { formatMargin, formatUsd, formatWhen } from "../../../../lib/format";
import { CLASS_LABEL, STATUS_LABEL } from "../../../../lib/labels";
import { notifySaved } from "../../../../lib/notify";
import type { ProductDetail, User } from "../../../../lib/types";

export default function ProductPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
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
    brazil_price_reference: "",
    supplier_number: "",
    supplier_name: "",
    supplier_phone: "",
    supplier_notes: "",
  });

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
        brazil_price_reference: detail.brazil_price_reference ?? "",
        supplier_number: detail.supplier?.number ?? "",
        supplier_name: detail.supplier?.name ?? "",
        supplier_phone: detail.supplier?.phone ?? "",
        supplier_notes: detail.supplier?.notes ?? "",
      });
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

  async function save() {
    if (!product) return;
    setSaving(true);
    setFields({});
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
          brazil_price_reference: form.brazil_price_reference,
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

  return (
    <div className="mx-auto grid max-w-3xl gap-6 pb-28 md:pb-8">
      <Link href="/produtos" className="inline-flex min-h-11 items-center gap-2 font-semibold no-underline">
        <IconBack /> Produtos
      </Link>
      <PageIntro title={product.name || "Sem nome"} subtitle={product.stand ? `Stand ${product.stand}` : undefined} />
      <div className="flex flex-wrap items-center gap-3">
        <Badge tone={product.status === "PENDING" ? "warn" : "info"}>{STATUS_LABEL[product.status]}</Badge>
        <span className="font-semibold">{formatUsd(product.fair_price_usd)}</span>
      </div>
      {cover ? (
        <img src={cover.url} alt={product.name || "Foto do produto"} className="max-h-80 w-full rounded-xl border border-line object-contain bg-surface" />
      ) : (
        <div className="grid min-h-40 place-items-center rounded-xl border border-dashed border-line bg-surface text-muted">Sem imagem</div>
      )}
      {product.missing.length > 0 ? (
        <section className="rounded-xl border border-warn bg-warn-soft p-4">
          <h2 className="section-title">Falta</h2>
          <ul className="mt-2 list-disc pl-5">
            {product.missing.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}
      <SectionCard title="Preços">
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
        <Field label="Referência do preço">
          {(id) => <input id={id} value={form.brazil_price_reference} onChange={(event) => set("brazil_price_reference", event.target.value)} />}
        </Field>
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
        <Field label="Nome" hint="Entra na análise." error={fields["supplier.name"]}>
          {(id) => <input id={id} value={form.supplier_name} onChange={(event) => set("supplier_name", event.target.value)} />}
        </Field>
        <Field label="Telefone">
          {(id) => <input id={id} inputMode="tel" value={form.supplier_phone} onChange={(event) => set("supplier_phone", event.target.value)} />}
        </Field>
        <Field label="Obs">
          {(id) => <textarea id={id} rows={2} value={form.supplier_notes} onChange={(event) => set("supplier_notes", event.target.value)} />}
        </Field>
      </SectionCard>
      <SectionCard title="Galeria">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">Até 10 fotos por produto.</p>
          <label className="inline-flex min-h-11 cursor-pointer items-center rounded-lg border border-line bg-surface px-4 font-semibold">
            Adicionar foto
            <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void upload(event.target.files?.[0] ?? null)} />
          </label>
        </div>
        {product.images.length === 0 ? <p className="text-muted">Sem imagem</p> : null}
        <ul className="flex gap-3 overflow-x-auto pb-2">
          {product.images.map((image) => (
            <li key={image.id} className="grid w-28 shrink-0 gap-2">
              <img src={image.url} alt="" className="h-28 w-28 rounded-lg border border-line object-cover" />
              <button type="button" className="min-h-11 text-sm font-semibold text-danger" onClick={() => void removeImage(image.id)}>
                Remover
              </button>
            </li>
          ))}
        </ul>
      </SectionCard>
      <SectionCard title="Histórico">
        {product.latest_analysis ? (
          <Link href={`/produtos/${product.id}/resultado`} className="inline-flex min-h-11 items-center font-semibold">
            Ver última análise
          </Link>
        ) : null}
        {product.analyses.length === 0 ? <p className="text-muted">Nenhuma análise ainda.</p> : null}
        <ol className="grid gap-2">
          {product.analyses.map((analysis) => (
            <li key={analysis.id}>
              <Link href={`/produtos/${product.id}/resultado?analise=${analysis.id}`} className="flex min-h-11 items-center justify-between rounded-xl border border-line bg-surface px-4 no-underline">
                <span className="font-semibold text-ink">
                  #{analysis.sequence} · <span className="text-emphasis">{formatMargin(analysis.margin)}</span> · {CLASS_LABEL[analysis.classification]}
                </span>
                <span className="text-sm text-muted">{formatWhen(analysis.created_at)}</span>
              </Link>
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap gap-3 border-t border-line pt-4">
          {product.status !== "ARCHIVED" ? (
            <Button variant="secondary" onClick={() => setConfirm("archive")}>
              Arquivar
            </Button>
          ) : null}
          {user?.role === "ADMIN" ? (
            <Button variant="danger" onClick={() => setConfirm("delete")}>
              Excluir
            </Button>
          ) : null}
        </div>
      </SectionCard>
      <div className="sticky-action-bar w-full justify-between">
        <Button variant="secondary" disabled={saving} onClick={() => void save()}>
          Salvar
        </Button>
        <Button disabled={saving || !product.can_analyze} onClick={() => void analyze()}>
          {saving ? "Analisando…" : "Analisar"}
        </Button>
      </div>
      {!product.can_analyze && product.status !== "ARCHIVED" ? (
        <p className="text-sm text-muted">Analisar fica disponível quando nome, preços, fornecedor, câmbio e alíquotas estiverem preenchidos.</p>
      ) : null}
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
