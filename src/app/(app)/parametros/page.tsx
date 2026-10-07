"use client";

import { useEffect, useState } from "react";
import { Button, ErrorState, Field, PageIntro, SectionCard, Skeleton, useToast } from "../../../components/ui";
import { api, ApiError } from "../../../lib/api";
import { formatPlain } from "../../../lib/format";
import type { Parameters } from "../../../lib/types";

type ParameterForm = {
  exchange_rate: string;
  import_tax_percent: string;
  nationalization_percent: string;
  freight_percent: string;
  sales_tax_percent: string;
  operational_cost_percent: string;
};

const READ_ROWS: { key: keyof ParameterForm; label: string }[] = [
  { key: "exchange_rate", label: "Câmbio (R$ por 1 USD)" },
  { key: "import_tax_percent", label: "Imposto importação %" },
  { key: "nationalization_percent", label: "Nacionalização %" },
  { key: "freight_percent", label: "Frete + outros %" },
  { key: "sales_tax_percent", label: "Imposto sobre venda %" },
  { key: "operational_cost_percent", label: "Custo operacional %" },
];

function fieldFromApi(value: string | null, fallback: string): string {
  if (value == null || value === "") return fallback;
  return formatPlain(value);
}

function formFromParameters(data: Parameters): ParameterForm {
  return {
    exchange_rate: fieldFromApi(data.exchange_rate, ""),
    import_tax_percent: fieldFromApi(data.import_tax_percent, ""),
    nationalization_percent: fieldFromApi(data.nationalization_percent, ""),
    freight_percent: fieldFromApi(data.freight_percent, ""),
    sales_tax_percent: fieldFromApi(data.sales_tax_percent, "8"),
    operational_cost_percent: fieldFromApi(data.operational_cost_percent, "5"),
  };
}

function isParametersComplete(form: ParameterForm): boolean {
  return (
    form.exchange_rate.trim() !== "" &&
    form.import_tax_percent.trim() !== "" &&
    form.nationalization_percent.trim() !== "" &&
    form.freight_percent.trim() !== ""
  );
}

export default function ParametersPage() {
  const toast = useToast();
  const [forbidden, setForbidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [version, setVersion] = useState<number | null>(null);
  const [form, setForm] = useState<ParameterForm>({
    exchange_rate: "",
    import_tax_percent: "",
    nationalization_percent: "",
    freight_percent: "",
    sales_tax_percent: "8",
    operational_cost_percent: "5",
  });
  const [savedForm, setSavedForm] = useState<ParameterForm | null>(null);

  useEffect(() => {
    api<Parameters>("/api/financial-parameters")
      .then((data) => {
        setVersion(data.version);
        const next = formFromParameters(data);
        setForm(next);
        setSavedForm(next);
        setEditing(!isParametersComplete(next));
      })
      .catch((caught) => {
        if (caught instanceof ApiError && caught.status === 403) setForbidden(true);
        else setError(caught instanceof ApiError ? caught.message : "Sem conexão. Os dados precisam de internet.");
      })
      .finally(() => setLoading(false));
  }, []);

  function cancelEdit() {
    if (savedForm) setForm(savedForm);
    setFields({});
    setEditing(false);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFields({});
    try {
      const saved = await api<Parameters>("/api/financial-parameters", {
        method: "PATCH",
        body: JSON.stringify(form),
      });
      setVersion(saved.version);
      const next = formFromParameters(saved);
      setForm(next);
      setSavedForm(next);
      setEditing(false);
      toast(`Parâmetros salvos. Versão ${saved.version}. Análises antigas não mudam.`);
    } catch (caught) {
      if (caught instanceof ApiError) {
        setFields(caught.fields ?? {});
        if (caught.status === 403) setForbidden(true);
        else toast(caught.message);
      } else toast("Sem conexão. Os dados precisam de internet.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Skeleton className="h-64" />;
  if (forbidden) {
    return (
      <div className="mx-auto max-w-xl">
        <PageIntro title="Parâmetros" />
        <p>Só o administrador altera os parâmetros.</p>
      </div>
    );
  }
  if (error) return <ErrorState message={error} />;

  const canCancel = savedForm != null && isParametersComplete(savedForm);

  return (
    <div className="mx-auto grid max-w-xl gap-5">
      <PageIntro title="Parâmetros" subtitle={version ? `Versão ${version}. Cada análise guarda a versão usada.` : undefined} />
      {!editing ? (
        <>
          {!form.exchange_rate.trim() ? (
            <p className="rounded-xl border border-warn bg-warn-soft p-4 text-sm font-semibold text-warn">Sem câmbio a análise fica bloqueada.</p>
          ) : null}
          <SectionCard>
            <div className="grid gap-1">
              <dt className="text-sm font-semibold">Câmbio (R$ por 1 USD)</dt>
              <dd className={form.exchange_rate.trim() ? "text-emphasis" : "text-warn"}>{form.exchange_rate || "—"}</dd>
            </div>
          </SectionCard>
          <SectionCard title="Custo na entrada">
            <dl className="grid gap-4">
              {READ_ROWS.filter(({ key }) => key !== "exchange_rate" && key !== "sales_tax_percent" && key !== "operational_cost_percent").map(({ key, label }) => (
                <div key={key} className="grid gap-1">
                  <dt className="text-sm font-semibold">{label}</dt>
                  <dd>{form[key] || "—"}</dd>
                </div>
              ))}
            </dl>
          </SectionCard>
          <SectionCard title="Sobre a venda">
            <dl className="grid gap-4">
              {READ_ROWS.filter(({ key }) => key === "sales_tax_percent" || key === "operational_cost_percent").map(({ key, label }) => (
                <div key={key} className="grid gap-1">
                  <dt className="text-sm font-semibold">{label}</dt>
                  <dd>{form[key] || "—"}</dd>
                </div>
              ))}
            </dl>
          </SectionCard>
          <Button type="button" variant="secondary" onClick={() => setEditing(true)}>
            Editar
          </Button>
        </>
      ) : (
        <form className="grid gap-4" onSubmit={(event) => void save(event)}>
          <Field label="Câmbio (R$ por 1 USD)" error={fields.exchange_rate}>
            {(id) => (
              <input id={id} inputMode="decimal" value={form.exchange_rate} onChange={(event) => setForm({ ...form, exchange_rate: event.target.value })} />
            )}
          </Field>
          <h3 className="section-title">Custo na entrada</h3>
          <Field label="Imposto importação %" error={fields.import_tax_percent}>
            {(id) => (
              <input id={id} inputMode="decimal" value={form.import_tax_percent} onChange={(event) => setForm({ ...form, import_tax_percent: event.target.value })} />
            )}
          </Field>
          <Field label="Nacionalização %" error={fields.nationalization_percent}>
            {(id) => (
              <input id={id} inputMode="decimal" value={form.nationalization_percent} onChange={(event) => setForm({ ...form, nationalization_percent: event.target.value })} />
            )}
          </Field>
          <Field label="Frete + outros %" error={fields.freight_percent}>
            {(id) => (
              <input id={id} inputMode="decimal" value={form.freight_percent} onChange={(event) => setForm({ ...form, freight_percent: event.target.value })} />
            )}
          </Field>
          <h3 className="section-title">Sobre a venda</h3>
          <Field label="Imposto sobre venda %" error={fields.sales_tax_percent}>
            {(id) => (
              <input id={id} inputMode="decimal" value={form.sales_tax_percent} onChange={(event) => setForm({ ...form, sales_tax_percent: event.target.value })} />
            )}
          </Field>
          <Field label="Custo operacional %" error={fields.operational_cost_percent}>
            {(id) => (
              <input id={id} inputMode="decimal" value={form.operational_cost_percent} onChange={(event) => setForm({ ...form, operational_cost_percent: event.target.value })} />
            )}
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando…" : "Salvar parâmetros"}
            </Button>
            {canCancel ? (
              <Button type="button" variant="secondary" disabled={saving} onClick={cancelEdit}>
                Cancelar
              </Button>
            ) : null}
          </div>
        </form>
      )}
    </div>
  );
}
